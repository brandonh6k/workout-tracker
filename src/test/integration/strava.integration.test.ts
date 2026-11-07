import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, SUPABASE_URL } from './setup'
import {
  createTestUser,
  cleanupTestUser,
  seedTemplate,
  seedWorkoutSession,
  type TestUser,
} from './helpers'

let userA: TestUser
let userB: TestUser
let userASessionId: string
let userBSessionId: string

async function callStrava(user: TestUser | null, body: Record<string, unknown>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (user) {
    const { data } = await user.client.auth.getSession()
    headers.Authorization = `Bearer ${data.session!.access_token}`
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/strava`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

beforeAll(async () => {
  userA = await createTestUser('strava-a')
  userB = await createTestUser('strava-b')

  for (const [user, assign] of [
    [userA, (id: string) => (userASessionId = id)],
    [userB, (id: string) => (userBSessionId = id)],
  ] as const) {
    const { template } = await seedTemplate(user.client, {
      name: 'Pull',
      exercises: [{ exercise_name: 'Lat Pulldown' }],
    })
    const { session } = await seedWorkoutSession(user.client, template.id, [
      { exercise_name: 'Lat Pulldown', set_number: 1, weight: 160, reps: 10 },
    ])
    assign(session.id)
  }

  const { error } = await adminClient.from('strava_connections').insert({
    user_id: userB.id,
    athlete_id: 42,
    access_token: 'secret-access',
    refresh_token: 'secret-refresh',
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    scope: 'read,activity:write',
  })
  if (error) throw error
})

afterAll(async () => {
  await cleanupTestUser(userA.id)
  await cleanupTestUser(userB.id)
})

describe('strava_connections RLS', () => {
  it('hides tokens from the owning user', async () => {
    const { data, error } = await userB.client.from('strava_connections').select('*')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('blocks users from writing their own connection row', async () => {
    const { error } = await userA.client.from('strava_connections').insert({
      user_id: userA.id,
      athlete_id: 1,
      access_token: 'x',
      refresh_token: 'x',
      expires_at: new Date().toISOString(),
      scope: 'activity:write',
    })
    expect(error).not.toBeNull()
  })

  it('cannot set strava_activity_id on another user\'s session', async () => {
    const { data } = await userA.client
      .from('workout_sessions')
      .update({ strava_activity_id: 123 })
      .eq('id', userBSessionId)
      .select()
    expect(data).toEqual([])

    const { data: row } = await adminClient
      .from('workout_sessions')
      .select('strava_activity_id')
      .eq('id', userBSessionId)
      .single()
    expect(row!.strava_activity_id).toBeNull()
  })
})

describe('strava edge function', () => {
  it('rejects calls without a user token', async () => {
    const { status } = await callStrava(null, { action: 'status' })
    expect(status).toBe(401)
  })

  it('reports connection status per user', async () => {
    expect((await callStrava(userA, { action: 'status' })).body).toEqual({ connected: false })
    expect((await callStrava(userB, { action: 'status' })).body).toEqual({ connected: true })
  })

  it('refuses a grant without activity:write', async () => {
    const { status, body } = await callStrava(userA, { action: 'exchange', code: 'abc', scope: 'read' })
    expect(status).toBe(400)
    expect(body.error).toMatch(/Upload your activities/)
  })

  it('will not upload another user\'s workout', async () => {
    const { status } = await callStrava(userB, {
      action: 'upload',
      sessionId: userASessionId,
      activity: { name: 'x', start_date_local: '2026-10-23T07:00:00', elapsed_time: 60, description: '' },
    })
    expect(status).toBe(404)
  })

  it('returns 412 when uploading without a connection', async () => {
    const { status } = await callStrava(userA, {
      action: 'upload',
      sessionId: userASessionId,
      activity: { name: 'x', start_date_local: '2026-10-23T07:00:00', elapsed_time: 60, description: '' },
    })
    expect(status).toBe(412)
  })
})
