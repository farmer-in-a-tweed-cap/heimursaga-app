import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads and shows content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Heimursaga/);
    // Header renders
    await expect(page.locator('header')).toBeVisible();
    // Footer renders
    await expect(page.locator('footer')).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    // Expeditions link
    const expeditionsLink = page.locator('a[href="/expeditions"]').first();
    if (await expeditionsLink.isVisible()) {
      await expeditionsLink.click();
      await expect(page).toHaveURL(/\/expeditions/);
    }
  });

  test('auth page loads', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('input')).toBeTruthy();
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    // Should show some kind of not-found content
    await expect(page.locator('body')).toContainText(/not found|404|page/i);
  });
});
