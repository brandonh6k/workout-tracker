/**
 * E2E test helpers — plain fetch calls to local Supabase REST + admin APIs.
 * No @supabase/supabase-js dependency needed in Playwright context.
 */

import type { Page } from '@playwright/test'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export interface TestUser {
  id: string
  email: string
  password: string
}

/** Create a test user via Supabase admin API. */
export async function createTestUser(): Promise<TestUser> {
  const suffix = Math.random().toString(36).slice(2, 10)
  const email = `e2e-${suffix}@test.local`
  const password = 'test-password-123!'

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  if (!res.ok) throw new Error(`Create user failed: ${await res.text()}`)
  const data = await res.json()
  return { id: data.id, email, password }
}

/** Delete a test user (cascades all data). */
export async function deleteTestUser(userId: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) console.warn(`Delete user failed: ${await res.text()}`)
}

/** Sign in and return an access token + user ID. */
export async function signIn(
  email: string,
  password: string
): Promise<{ token: string; userId: string }> {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  )
  if (!res.ok) throw new Error(`Sign-in failed: ${await res.text()}`)
  const data = await res.json()
  return { token: data.access_token as string, userId: data.user.id as string }
}

/** POST to the Supabase REST API as the signed-in user. */
export async function restInsert(
  token: string,
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[],
  select = true
): Promise<Record<string, unknown>[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}${select ? '?select=*' : ''}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      Prefer: select ? 'return=representation' : 'return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`Insert into ${table} failed: ${await res.text()}`)
  return select ? res.json() : []
}

/** Day-of-week number: 0 = Sunday … 6 = Saturday. */
function todayDow(): number {
  return new Date().getDay()
}

/** Log in via the UI and wait for the dashboard. */
export async function loginViaUI(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.getByText("Today's Workout").waitFor({ timeout: 10_000 })
}

/** Seed a workout template with configurable exercises via REST API. */
export async function seedTemplate(
  email: string,
  password: string,
  opts?: {
    name?: string
    exercises?: Array<{
      name: string
      sets: number
      reps: number
      restSeconds?: number
    }>
  }
): Promise<{ templateId: string; templateName: string }> {
  const { token, userId } = await signIn(email, password)
  const templateName = opts?.name ?? 'E2E Template'
  const exercises = opts?.exercises ?? [
    { name: 'Bench Press', sets: 3, reps: 8 },
  ]

  const [template] = await restInsert(token, 'workout_templates', {
    user_id: userId,
    name: templateName,
  })

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i]
    await restInsert(token, 'template_exercises', {
      template_id: template.id,
      exercise_name: ex.name,
      target_sets: ex.sets,
      target_reps: ex.reps,
      rest_seconds: ex.restSeconds ?? 90,
      order_index: i,
    })
  }

  return { templateId: template.id as string, templateName }
}

/** Seed a completed workout session with 1 logged set. */
export async function seedCompletedWorkout(
  email: string,
  password: string
): Promise<{ sessionId: string; exerciseName: string }> {
  const { token, userId } = await signIn(email, password)
  const exerciseName = 'Bench Press'

  const [template] = await restInsert(token, 'workout_templates', {
    user_id: userId,
    name: 'E2E Completed',
  })

  await restInsert(token, 'template_exercises', {
    template_id: template.id,
    exercise_name: exerciseName,
    target_sets: 1,
    target_reps: 5,
    rest_seconds: 90,
    order_index: 0,
  })

  const [session] = await restInsert(token, 'workout_sessions', {
    user_id: userId,
    template_id: template.id,
    date: new Date().toISOString().split('T')[0],
    duration_minutes: 30,
    completed: true,
  })

  await restInsert(token, 'logged_sets', {
    session_id: session.id,
    exercise_name: exerciseName,
    set_number: 1,
    weight: 185,
    reps: 5,
  })

  return { sessionId: session.id as string, exerciseName }
}

interface ScheduledWorkoutOpts {
  exerciseName?: string
  templateName?: string
  targetSets?: number
  targetReps?: number
  targetWeight?: number
  restSeconds?: number
}

/**
 * Seed a scheduled workout for today.
 * Defaults to 1 set of Bench Press @ 185# × 5 reps.
 */
export async function seedScheduledWorkout(
  email: string,
  password: string,
  opts?: ScheduledWorkoutOpts
): Promise<{ exerciseName: string }> {
  const { token, userId } = await signIn(email, password)
  const exerciseName = opts?.exerciseName ?? 'Bench Press'

  const [template] = await restInsert(token, 'workout_templates', {
    user_id: userId,
    name: opts?.templateName ?? 'E2E RPE Test',
  })

  await restInsert(token, 'template_exercises', {
    template_id: template.id,
    exercise_name: exerciseName,
    target_sets: opts?.targetSets ?? 1,
    target_reps: opts?.targetReps ?? 5,
    rest_seconds: opts?.restSeconds ?? 90,
    order_index: 0,
  })

  const [scheduledWorkout] = await restInsert(token, 'scheduled_workouts', {
    user_id: userId,
    template_id: template.id,
    day_of_week: todayDow(),
  })

  await restInsert(token, 'scheduled_exercises', {
    scheduled_workout_id: scheduledWorkout.id,
    exercise_name: exerciseName,
    target_weight: opts?.targetWeight ?? 185,
    order_index: 0,
  })

  return { exerciseName }
}
