import { test, expect } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  loginViaUI,
  seedCompletedWorkout,
  type TestUser,
} from './helpers'

test.describe('History page', () => {
  let user: TestUser

  test.beforeAll(async () => {
    user = await createTestUser()
  })

  test.afterAll(async () => {
    await deleteTestUser(user.id)
  })

  test('display completed workout details', async ({ page }) => {
    await seedCompletedWorkout(user.email, user.password)

    await loginViaUI(page, user)
    await page.getByRole('link', { name: /History/ }).click()
    await expect(page.getByRole('heading', { name: 'HISTORY' })).toBeVisible({ timeout: 5_000 })

    // Verify sections
    await expect(page.getByText('RECENT WORKOUTS')).toBeVisible()
    await expect(page.getByText('EXERCISES')).toBeVisible()

    // Verify workout stats (1 exercise, 1 set, 185 × 5 = 925# volume)
    await expect(page.getByText('1 ex · 1 sets · 925#')).toBeVisible()

    // Verify exercise button
    await expect(page.getByRole('button', { name: /Bench Press/ })).toBeVisible()
  })

  test('delete a workout from history', async ({ page }) => {
    // Seed 2 workouts (tests run in parallel, can't depend on other test's data)
    await seedCompletedWorkout(user.email, user.password)
    await seedCompletedWorkout(user.email, user.password)

    await loginViaUI(page, user)
    await page.getByRole('link', { name: /History/ }).click()
    await expect(page.getByText('2 workouts logged')).toBeVisible({ timeout: 5_000 })

    // Click delete on the first workout
    await page.getByTitle('Delete workout').first().click()

    // Confirm in dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('DELETE WORKOUT')).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete' }).click()

    // Verify count decreased
    await expect(page.getByText('1 workout logged')).toBeVisible({ timeout: 5_000 })
  })
})
