import { test, expect } from '@playwright/test';

test.describe('SEO and meta tags', () => {
  test('homepage has correct meta tags', async ({ page }) => {
    await page.goto('/');

    // Title
    await expect(page).toHaveTitle(/Heimursaga/);

    // Meta description
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /explorer|journal|adventure/i);

    // OG tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /Heimursaga/);

    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute('content', 'website');
  });

  test('security headers are set', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() || {};

    // HSTS
    if (headers['strict-transport-security']) {
      expect(headers['strict-transport-security']).toContain('max-age=');
    }

    // X-Content-Type-Options
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('redirects work correctly', async ({ page }) => {
    // /login should redirect to /auth
    await page.goto('/login');
    await expect(page).toHaveURL(/\/auth/);

    // /signup should redirect to /auth
    await page.goto('/signup');
    await expect(page).toHaveURL(/\/auth/);
  });
});
