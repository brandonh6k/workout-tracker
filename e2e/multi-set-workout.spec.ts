import { test, expect } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  loginViaUI,
  seedScheduledWorkout,
  type TestUser,
} from './helpers'

let user: TestUser

test.beforeAll(async () => {
  user = await createTestUser()
  await seedScheduledWorkout(user.email, user.password, {
    exerciseName: 'Bench Press',
    templateName: 'E2E Multi-Set',
    targetSets: 2,
    targetReps: 5,
    targetWeight: 185,
    restSeconds: 90,
  })
})

test.afterAll(async () => {
  await deleteTestUser(user.id)
})

test('2-set workout with rest timer skip', async ({ page }) => {
  await loginViaUI(page, user)

  // Start the workout
  await page.getByRole('button', { name: 'Start Workout' }).click()
  await expect(page.getByText('BENCH PRESS')).toBeVisible({ timeout: 5_000 })

  // Complete set 1
  await page.getByRole('button', { name: 'Done' }).click()

  // Rest screen appears
  await expect(page.getByText('Rest', { exact: true })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByRole('button', { name: 'Skip Rest' })).toBeVisible()
  await expect(page.getByRole('button', { name: '+30s' })).toBeVisible()

  // Verify Up Next shows set 2 info
  await expect(page.getByText('Up Next')).toBeVisible()

  // Skip rest
  await page.getByRole('button', { name: 'Skip Rest' }).click()

  // Back to active set (set 2)
  await expect(page.getByText('BENCH PRESS')).toBeVisible({ timeout: 5_000 })

  // Complete set 2
  await page.getByRole('button', { name: 'Done' }).click()

  // After last set, DONE screen shows (completion check has priority over resting phase)
  await expect(page.getByText('DONE')).toBeVisible({ timeout: 5_000 })

  // Save and finish
  await page.getByRole('button', { name: 'Save & Finish' }).click()
  await expect(page.getByText("Today's Workout")).toBeVisible({ timeout: 10_000 })
})
