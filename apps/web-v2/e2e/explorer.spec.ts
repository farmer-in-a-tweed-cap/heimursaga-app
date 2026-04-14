import { test, expect } from '@playwright/test';

test.describe('Explorer pages', () => {
  test('explorers listing page loads', async ({ page }) => {
    await page.goto('/explorers');
    await expect(page).toHaveTitle(/Explorers|Heimursaga/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('explorer profile handles missing user', async ({ page }) => {
    await page.goto('/journal/nonexistent-user-12345');
    // Should show error state, not crash
    await expect(page.locator('body')).not.toHaveText('Application error');
  });
});
