import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    // Page title
    await expect(page).toHaveTitle('Workout Tracker');

    // Brand heading
    await expect(page.getByRole('heading', { name: 'IRON FORGE' })).toBeVisible();

    // Form fields
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Sign in button
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Sign up link
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });
});
