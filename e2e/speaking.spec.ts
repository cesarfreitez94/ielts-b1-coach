import { test, expect } from '@playwright/test';

test.describe('Speaking Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'e2e@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('record -> transcribe -> evaluate flow', async ({ page }) => {
    await page.goto('/speaking');

    await expect(page.locator('text=Speaking Practice')).toBeVisible();
    await expect(page.locator('text=Click to start recording')).toBeVisible();
  });
});