import { test, expect } from '@playwright/test';

test.describe('Writing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'e2e@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('prompt select -> write -> evaluate', async ({ page }) => {
    await page.goto('/writing');

    await expect(page.locator('text=Writing Practice')).toBeVisible();
    await expect(page.locator('text=Get Feedback')).toBeVisible();

    const textarea = page.locator('textarea');
    await textarea.fill('My city is very big and beautiful. There are many parks and restaurants.');
    await page.click('text=Get Feedback');

    await page.waitForTimeout(2000);
  });
});