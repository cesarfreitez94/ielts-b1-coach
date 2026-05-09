import { test, expect } from '@playwright/test';

test.describe('Settings Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'e2e@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('configure provider + API key', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.locator('text=AI Provider')).toBeVisible();
    await expect(page.locator('text=Kimi (Moonshot)')).toBeVisible();

    await page.selectOption('select:first-of-type', 'anthropic');
    await expect(page.locator('text=claude-sonnet-4-20250514')).toBeVisible();

    await page.click('text=Save Settings');
    await expect(page.locator('text=Settings saved')).toBeVisible();
  });
});