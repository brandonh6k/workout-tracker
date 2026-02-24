import { test, expect } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  loginViaUI,
  seedTemplate,
  type TestUser,
} from './helpers'

test.describe('Template CRUD', () => {
  let user: TestUser

  test.beforeAll(async () => {
    user = await createTestUser()
  })

  test.afterAll(async () => {
    await deleteTestUser(user.id)
  })

  test('create a template via UI', async ({ page }) => {
    await loginViaUI(page, user)

    // Navigate to templates
    await page.getByRole('link', { name: /Templates/ }).click()
    await expect(page.getByRole('heading', { name: 'TEMPLATES' })).toBeVisible({ timeout: 5_000 })

    // Click "New" button
    await page.getByRole('button', { name: 'New' }).click()

    // Fill template name
    await page.getByLabel('Name *').fill('Upper Body Test')

    // Add an exercise
    await page.getByRole('button', { name: 'Add Exercise' }).click()

    // Type into the autocomplete and select Bench Press
    const exerciseInput = page.getByPlaceholder('Exercise name')
    await exerciseInput.fill('Bench')
    await page.getByText('Bench Press').first().click()

    // Submit
    await page.getByRole('button', { name: 'Create Template' }).click()

    // Verify on templates list
    await expect(page.getByText('UPPER BODY TEST')).toBeVisible({ timeout: 5_000 })
  })

  test('edit a template', async ({ page }) => {
    await seedTemplate(user.email, user.password, { name: 'Edit Me' })

    await loginViaUI(page, user)
    await page.getByRole('link', { name: /Templates/ }).click()
    await expect(page.getByText('EDIT ME')).toBeVisible({ timeout: 5_000 })

    // Click edit on the "Edit Me" card
    const card = page.locator('div.group').filter({ hasText: 'EDIT ME' })
    await card.getByTitle('Edit').click()

    // Clear and fill new name
    const nameInput = page.getByLabel('Name *')
    await nameInput.clear()
    await nameInput.fill('Edited Template')

    // Save
    await page.getByRole('button', { name: 'Save Changes' }).click()

    // Verify updated name on list
    await expect(page.getByText('EDITED TEMPLATE')).toBeVisible({ timeout: 5_000 })
  })

  test('delete a template', async ({ page }) => {
    await seedTemplate(user.email, user.password, { name: 'Delete Me' })

    await loginViaUI(page, user)
    await page.getByRole('link', { name: /Templates/ }).click()
    await expect(page.getByText('DELETE ME')).toBeVisible({ timeout: 5_000 })

    // Click delete on the "Delete Me" card
    const card = page.locator('div.group').filter({ hasText: 'DELETE ME' })
    await card.getByTitle('Delete').click()

    // Confirm in dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('DELETE TEMPLATE')).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete' }).click()

    // Verify gone
    await expect(page.getByText('DELETE ME')).not.toBeVisible({ timeout: 5_000 })
  })
})
