import { test, expect } from '@playwright/test'
import { createTestUser, deleteTestUser, seedScheduledWorkout, type TestUser } from './helpers'

let user: TestUser
let exerciseName: string

test.beforeAll(async () => {
  user = await createTestUser()
  const seed = await seedScheduledWorkout(user.email, user.password)
  exerciseName = seed.exerciseName
})

test.afterAll(async () => {
  await deleteTestUser(user.id)
})

test('RPE and notes round-trip', async ({ page }) => {
  // 1. Login
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByText("Today's Workout")).toBeVisible({ timeout: 10_000 })

  // 2. Start workout & log set with RPE + notes
  await page.getByRole('button', { name: 'Start Workout' }).click()
  await expect(page.getByText(exerciseName.toUpperCase())).toBeVisible({ timeout: 5_000 })

  // Select RPE 8
  await page.getByRole('button', { name: '8', exact: true }).click()

  // Add a note
  await page.getByText('+ add note').click()
  await page.getByPlaceholder('Set note...').fill('Felt strong')

  // Complete the set
  await page.getByRole('button', { name: 'Done' }).click()

  // 3. Complete workout — with 1 set, we go straight to completion screen
  await expect(page.getByText('DONE')).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: 'Save & Finish' }).click()
  await expect(page.getByText("Today's Workout")).toBeVisible({ timeout: 10_000 })

  // 4. Navigate to exercise history
  await page.getByRole('link', { name: /History/ }).click()
  await expect(page.getByRole('heading', { name: 'HISTORY' })).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: new RegExp(exerciseName) }).click()
  await expect(page.getByRole('heading', { name: exerciseName.toUpperCase() })).toBeVisible({ timeout: 5_000 })

  // 5. Assert RPE and notes are visible on the logged set
  await expect(page.getByText('@8')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('span[title*="Felt strong"]')).toBeVisible()
})
