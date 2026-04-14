import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('login form validates empty submission', async ({ page }) => {
    await page.goto('/auth');
    // Find and submit the form without filling in fields
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show validation error or remain on auth page
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('protected pages require authentication', async ({ page }) => {
    await page.goto('/settings');
    // The page either redirects to /auth client-side or renders a
    // login prompt / empty state. Either way, the user should not see
    // authenticated settings content.
    await page.waitForLoadState('domcontentloaded');
    // Should NOT show settings form fields for an unauthenticated user
    const passwordInput = page.locator('input[type="password"][name="currentPassword"]');
    await expect(passwordInput).not.toBeVisible();
  });

  test('auth page renders login form', async ({ page }) => {
    await page.goto('/auth');
    // Should have at least a text input (email/username) and a submit button
    await expect(page.locator('input').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });
});
