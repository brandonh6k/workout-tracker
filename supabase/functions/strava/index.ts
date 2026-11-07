// Strava sync: OAuth code exchange, token refresh, and activity upload.
// Tokens live in strava_connections (service role only); session reads/writes use
// the caller's JWT so workout_sessions RLS decides ownership.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const STRAVA_OAUTH_URL = 'https://www.strava.com/oauth'
const STRAVA_API_URL = 'https://www.strava.com/api/v3'
const REFRESH_MARGIN_MS = 60_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Connection = {
  user_id: string
  athlete_id: number
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: { id: number }
}

type ActivityInput = {
  name: string
  start_date_local: string
  elapsed_time: number
  description: string
}

type HttpError = Error & { status: number }

const httpError = (status: number, message: string): HttpError =>
  Object.assign(new Error(message), { status })

const isHttpError = (err: unknown): err is HttpError =>
  err instanceof Error && typeof (err as HttpError).status === 'number'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) throw httpError(401, 'Not authenticated')

    const body = await req.json()
    switch (body.action) {
      case 'status':
        return json({ connected: (await getConnection(user.id)) !== null })
      case 'exchange':
        return json(await exchange(user.id, body.code, body.scope))
      case 'upload':
        return json(await upload(userClient, user.id, body.sessionId, body.activity))
      case 'disconnect':
        await disconnect(user.id)
        return json({ connected: false })
      default:
        throw httpError(400, `Unknown action: ${body.action}`)
    }
  } catch (err) {
    if (isHttpError(err)) return json({ error: err.message }, err.status)
    console.error(err)
    return json({ error: 'Internal error' }, 500)
  }
})

async function exchange(userId: string, code: unknown, scope: unknown) {
  if (typeof code !== 'string' || !code) throw httpError(400, 'Missing code')
  // The consent screen lets the athlete untick write access
  if (typeof scope !== 'string' || !scope.split(',').includes('activity:write')) {
    throw httpError(400, 'Strava access must include "Upload your activities"')
  }

  const token = await requestToken({ grant_type: 'authorization_code', code })
  if (!token.athlete) throw httpError(502, 'Strava did not return an athlete')

  const { error } = await admin.from('strava_connections').upsert({
    user_id: userId,
    athlete_id: token.athlete.id,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(token.expires_at * 1000).toISOString(),
    scope,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
  return { connected: true }
}

async function upload(userClient: SupabaseClient, userId: string, sessionId: unknown, activity: ActivityInput) {
  if (typeof sessionId !== 'string') throw httpError(400, 'Missing sessionId')

  const { data: session, error } = await userClient
    .from('workout_sessions')
    .select('id, completed, strava_activity_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (error) throw error
  if (!session) throw httpError(404, 'Workout not found')
  if (!session.completed) throw httpError(400, 'Workout is not finished')
  if (session.strava_activity_id) throw httpError(409, 'Workout is already on Strava')

  const accessToken = await getAccessToken(userId)
  const res = await fetch(`${STRAVA_API_URL}/activities`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: String(activity.name),
      sport_type: 'WeightTraining',
      start_date_local: String(activity.start_date_local),
      elapsed_time: Math.max(1, Math.round(Number(activity.elapsed_time))),
      description: String(activity.description ?? ''),
    }),
  })
  if (res.status === 401) {
    await admin.from('strava_connections').delete().eq('user_id', userId)
    throw httpError(401, 'Strava access was revoked. Reconnect Strava.')
  }
  if (!res.ok) {
    console.error('Strava upload failed', res.status, await res.text())
    throw httpError(502, `Strava rejected the upload (${res.status})`)
  }

  const created = await res.json()
  const { error: updateError } = await userClient
    .from('workout_sessions')
    .update({ strava_activity_id: created.id })
    .eq('id', sessionId)
  if (updateError) throw updateError

  return { activityId: created.id }
}

async function disconnect(userId: string) {
  const connection = await getConnection(userId)
  if (!connection) return

  // Best effort: the local row goes either way
  await fetch(`${STRAVA_OAUTH_URL}/deauthorize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${connection.access_token}` },
  }).catch((err) => console.error('Strava deauthorize failed', err))

  const { error } = await admin.from('strava_connections').delete().eq('user_id', userId)
  if (error) throw error
}

async function getConnection(userId: string): Promise<Connection | null> {
  const { data, error } = await admin
    .from('strava_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function getAccessToken(userId: string): Promise<string> {
  const connection = await getConnection(userId)
  if (!connection) throw httpError(412, 'Strava is not connected')

  if (new Date(connection.expires_at).getTime() - Date.now() > REFRESH_MARGIN_MS) {
    return connection.access_token
  }

  const token = await requestToken({ grant_type: 'refresh_token', refresh_token: connection.refresh_token })
  // Strava may rotate the refresh token, so always store the new one
  const { error } = await admin
    .from('strava_connections')
    .update({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  if (error) throw error
  return token.access_token
}

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${STRAVA_OAUTH_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('STRAVA_CLIENT_ID'),
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
      ...params,
    }),
  })
  if (!res.ok) {
    console.error('Strava token request failed', res.status, await res.text())
    throw httpError(502, 'Strava sign-in failed')
  }
  return res.json()
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
