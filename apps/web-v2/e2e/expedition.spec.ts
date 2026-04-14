import { test, expect } from '@playwright/test';

test.describe('Expedition pages', () => {
  test('expeditions listing page loads', async ({ page }) => {
    await page.goto('/expeditions');
    await expect(page).toHaveTitle(/Expeditions|Heimursaga/);
    // Should show expedition cards or a message
    await expect(page.locator('main')).toBeVisible();
  });

  test('expedition detail page handles missing expedition', async ({ page }) => {
    await page.goto('/expedition/nonexistent-id-12345');
    // Should show an error or not-found state, not crash
    await expect(page.locator('body')).not.toHaveText('Application error');
  });
});
