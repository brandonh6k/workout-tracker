import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { getWorkoutSession, type WorkoutSessionWithSets } from '../workouts/api'
import { buildStravaActivity } from './payload'

const OAUTH_STATE_KEY = 'strava_oauth_state'
const CALLBACK_PATH = '/history'

const NOT_CONNECTED = 412

type StravaError = Error & { status: number }

const isStravaError = (err: unknown): err is StravaError =>
  err instanceof Error && typeof (err as StravaError).status === 'number'

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('strava', { body })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null)
      throw Object.assign(new Error(payload?.error ?? 'Strava request failed'), { status: error.context.status })
    }
    throw error
  }
  return data as T
}

export function isStravaConfigured(): boolean {
  return Boolean(import.meta.env.VITE_STRAVA_CLIENT_ID)
}

export async function getStravaStatus(): Promise<boolean> {
  const { connected } = await invoke<{ connected: boolean }>({ action: 'status' })
  return connected
}

/** Sends the browser to Strava's consent screen; Strava redirects back to CALLBACK_PATH. */
export function startStravaConnect(): void {
  const state = crypto.randomUUID()
  sessionStorage.setItem(OAUTH_STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
    redirect_uri: `${window.location.origin}${CALLBACK_PATH}`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:write',
    state,
  })
  window.location.assign(`https://www.strava.com/oauth/authorize?${params}`)
}

/**
 * Finishes the OAuth round-trip if the current URL is a Strava callback.
 * Returns null when there is no callback to handle.
 */
export async function completeStravaConnect(search: URLSearchParams): Promise<boolean | null> {
  const state = search.get('state')
  if (!state || (!search.has('code') && !search.has('error'))) return null

  const expected = sessionStorage.getItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  if (state !== expected) throw new Error('Strava sign-in expired. Try connecting again.')
  if (search.get('error')) throw new Error('Strava access was not granted')

  const { connected } = await invoke<{ connected: boolean }>({
    action: 'exchange',
    code: search.get('code'),
    scope: search.get('scope'),
  })
  return connected
}

export async function uploadWorkoutToStrava(workout: WorkoutSessionWithSets): Promise<number> {
  const { activityId } = await invoke<{ activityId: number }>({
    action: 'upload',
    sessionId: workout.id,
    activity: buildStravaActivity(workout),
  })
  return activityId
}

/**
 * Uploads a just-finished workout when Strava is connected.
 * Returns the activity id, or null when Strava isn't set up for this user.
 */
export async function syncCompletedWorkout(sessionId: string): Promise<number | null> {
  if (!isStravaConfigured()) return null
  const workout = await getWorkoutSession(sessionId)
  if (!workout) return null
  try {
    return await uploadWorkoutToStrava(workout)
  } catch (err) {
    if (isStravaError(err) && err.status === NOT_CONNECTED) return null
    throw err
  }
}

export async function disconnectStrava(): Promise<void> {
  await invoke({ action: 'disconnect' })
}

export function stravaActivityUrl(activityId: number): string {
  return `https://www.strava.com/activities/${activityId}`
}
