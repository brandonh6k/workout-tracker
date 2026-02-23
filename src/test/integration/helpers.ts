import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { adminClient, SUPABASE_URL } from './setup'

const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export interface TestUser {
  id: string
  email: string
  password: string
  client: SupabaseClient
}

/**
 * Creates a test user via admin API and returns an authenticated client.
 */
export async function createTestUser(prefix = 'test'): Promise<TestUser> {
  const suffix = Math.random().toString(36).slice(2, 10)
  const email = `${prefix}-${suffix}@test.local`
  const password = 'test-password-123!'

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`Failed to create test user: ${error.message}`)

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError)
    throw new Error(`Failed to sign in test user: ${signInError.message}`)

  return { id: data.user.id, email, password, client }
}

/**
 * Deletes a test user and all their cascaded data.
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error)
    console.warn(`Failed to cleanup test user ${userId}: ${error.message}`)
}

/**
 * Returns an unauthenticated Supabase client.
 */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Seeds a workout template with exercises for testing.
 */
export async function seedTemplate(
  client: SupabaseClient,
  options: {
    name?: string
    notes?: string
    exercises?: Array<{
      exercise_name: string
      target_sets?: number
      target_reps?: number
      is_amrap?: boolean
      rest_seconds?: number
    }>
  } = {}
) {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: template, error: tErr } = await client
    .from('workout_templates')
    .insert({
      user_id: user.id,
      name: options.name ?? 'Test Template',
      notes: options.notes ?? null,
    })
    .select()
    .single()
  if (tErr) throw new Error(`Failed to seed template: ${tErr.message}`)

  const exercises = options.exercises ?? [
    { exercise_name: 'Bench Press', target_sets: 3, target_reps: 8 },
    { exercise_name: 'Squat', target_sets: 3, target_reps: 5 },
  ]

  const rows = exercises.map((ex, i) => ({
    template_id: template.id,
    exercise_name: ex.exercise_name,
    target_sets: ex.target_sets ?? 3,
    target_reps: ex.target_reps ?? 8,
    is_amrap: ex.is_amrap ?? false,
    rest_seconds: ex.rest_seconds ?? 90,
    order_index: i,
  }))

  const { data: templateExercises, error: eErr } = await client
    .from('template_exercises')
    .insert(rows)
    .select()
  if (eErr) throw new Error(`Failed to seed template exercises: ${eErr.message}`)

  return { template, exercises: templateExercises! }
}

/**
 * Seeds a completed workout session with logged sets.
 */
export async function seedWorkoutSession(
  client: SupabaseClient,
  templateId: string,
  sets: Array<{
    exercise_name: string
    set_number: number
    weight: number
    reps: number
  }>,
  options: { date?: string; notes?: string } = {}
) {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: session, error: sErr } = await client
    .from('workout_sessions')
    .insert({
      user_id: user.id,
      template_id: templateId,
      date: options.date ?? new Date().toISOString().split('T')[0],
      completed: true,
      duration_minutes: 45,
      notes: options.notes ?? null,
    })
    .select()
    .single()
  if (sErr) throw new Error(`Failed to seed session: ${sErr.message}`)

  const setRows = sets.map((s) => ({
    session_id: session.id,
    exercise_name: s.exercise_name,
    set_number: s.set_number,
    weight: s.weight,
    reps: s.reps,
  }))

  const { data: loggedSets, error: lErr } = await client
    .from('logged_sets')
    .insert(setRows)
    .select()
  if (lErr) throw new Error(`Failed to seed logged sets: ${lErr.message}`)

  return { session, loggedSets: loggedSets! }
}
