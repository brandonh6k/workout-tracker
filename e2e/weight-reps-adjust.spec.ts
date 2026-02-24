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
    exerciseName: 'Squat',
    templateName: 'E2E Weight Adjust',
    targetSets: 1,
    targetReps: 5,
    targetWeight: 225,
    restSeconds: 90,
  })
})

test.afterAll(async () => {
  await deleteTestUser(user.id)
})

test('adjust weight and reps, verify in history', async ({ page }) => {
  await loginViaUI(page, user)

  // Start the workout
  await page.getByRole('button', { name: 'Start Workout' }).click()
  await expect(page.getByText('SQUAT')).toBeVisible({ timeout: 5_000 })

  // Verify initial weight shows 225
  await expect(page.getByText('225')).toBeVisible()

  // Click weight to enter adjust mode
  await page.getByText('225').click()

  // Click +5 to increase weight to 230
  await page.getByRole('button', { name: '+5' }).click()
  await expect(page.getByText('230')).toBeVisible()

  // Click weight area again to exit adjust mode
  await page.getByText('230').click()

  // Click reps to enter reps adjust mode
  await page.getByText('5 reps').click()

  // Click −1 (unicode minus) to decrease reps to 4
  await page.getByRole('button', { name: '−1' }).click()
  await expect(page.getByText('4 reps')).toBeVisible()

  // Complete the set
  await page.getByRole('button', { name: 'Done' }).click()

  // DONE screen (1-set workout, completion check has priority)
  await expect(page.getByText('DONE')).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: 'Save & Finish' }).click()
  await expect(page.getByText("Today's Workout")).toBeVisible({ timeout: 10_000 })

  // Navigate to history
  await page.getByRole('link', { name: /History/ }).click()
  await expect(page.getByRole('heading', { name: 'HISTORY' })).toBeVisible({ timeout: 5_000 })

  // Click on Squat to view exercise history
  await page.getByRole('button', { name: /Squat/ }).click()
  await expect(page.getByRole('heading', { name: 'SQUAT' })).toBeVisible({ timeout: 5_000 })

  // Verify adjusted values in set badge
  await expect(page.getByText('230# × 4')).toBeVisible({ timeout: 5_000 })
})
