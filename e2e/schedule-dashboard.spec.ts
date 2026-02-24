import { test, expect } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  loginViaUI,
  seedTemplate,
  type TestUser,
} from './helpers'

let user: TestUser

test.beforeAll(async () => {
  user = await createTestUser()
  await seedTemplate(user.email, user.password, {
    name: 'Legs Day',
    exercises: [{ name: 'Squat', sets: 3, reps: 5 }],
  })
})

test.afterAll(async () => {
  await deleteTestUser(user.id)
})

test('schedule a workout and verify on dashboard', async ({ page }) => {
  await loginViaUI(page, user)

  // Navigate to schedule (first match is the nav link)
  await page.getByRole('link', { name: /Schedule/ }).first().click()
  await expect(page.getByText('WEEKLY SCHEDULE')).toBeVisible({ timeout: 5_000 })

  // Find today's card and click Add
  const todayCard = page.locator('.card', { hasText: 'Today' })
  await todayCard.getByRole('button', { name: /Add/ }).click()

  // Select template
  await page.getByLabel('Template').selectOption({ label: 'Legs Day (1 exercises)' })

  // Fill weight
  await page.getByRole('spinbutton').fill('225')

  // Submit
  await page.getByRole('button', { name: 'Schedule' }).click()

  // Verify on schedule page
  await expect(page.getByText('Legs Day')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByText('225#')).toBeVisible()

  // Navigate to dashboard and verify Start Workout button
  await page.getByRole('link', { name: /Dashboard/ }).click()
  await expect(page.getByRole('button', { name: 'Start Workout' })).toBeVisible({ timeout: 5_000 })
})
