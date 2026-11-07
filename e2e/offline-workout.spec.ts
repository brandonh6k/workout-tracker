import { test, expect } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  loginViaUI,
  seedScheduledWorkout,
  signIn,
  type TestUser,
} from './helpers'

test.use({ viewport: { width: 390, height: 844 } })

let user: TestUser

test.beforeAll(async () => {
  user = await createTestUser()
  await seedScheduledWorkout(user.email, user.password, {
    exerciseName: 'Bench Press',
    templateName: 'E2E Offline',
    targetSets: 2,
    targetReps: 5,
    targetWeight: 185,
    restSeconds: 90,
  })
})

test.afterAll(async () => {
  await deleteTestUser(user.id)
})

async function fetchSessions() {
  const { token } = await signIn(user.email, user.password)
  const res = await fetch(
    'http://127.0.0.1:54321/rest/v1/workout_sessions?select=completed,logged_sets(set_number,weight,reps)',
    {
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return (await res.json()) as Array<{ completed: boolean; logged_sets: Array<{ set_number: number }> }>
}

test('workout survives losing the database mid-session and a reload', async ({ page }) => {
  await loginViaUI(page, user)
  await page.getByRole('button', { name: 'Start Workout' }).click()
  await expect(page.getByText('BENCH PRESS')).toBeVisible({ timeout: 5_000 })

  // The gym Wi-Fi drops: every database call fails from here on
  await page.route('**/rest/v1/**', (route) => route.abort('internetdisconnected'))

  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Rest', { exact: true })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByText(/waiting to sync/)).toBeVisible({ timeout: 5_000 })

  // The phone kills the tab; the workout picks up on the rest screen
  await page.reload()
  await expect(page.getByText('Rest', { exact: true })).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Skip Rest' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('DONE')).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: 'Save & Finish' }).click()
  // The dashboard itself can't load offline (backlog: offline support); the banner says the workout is safe
  await expect(page.getByText(/\d changes saved on this device, waiting to sync/)).toBeVisible({ timeout: 10_000 })

  // Connection is back
  await page.unroute('**/rest/v1/**')
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByText(/waiting to sync/)).toBeHidden({ timeout: 10_000 })
  // whenIdle fires the dashboard refresh once everything has landed
  await expect(page.getByText("Today's Workout")).toBeVisible({ timeout: 10_000 })

  const sessions = await fetchSessions()
  expect(sessions).toHaveLength(1)
  expect(sessions[0].completed).toBe(true)
  expect(sessions[0].logged_sets.map((s) => s.set_number).sort()).toEqual([1, 2])
})
