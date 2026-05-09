import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('register -> dashboard flow', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'password123');
    await page.click('text=Create one');
    await page.fill('input[placeholder="Your name"]', 'Test User');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Your Progress')).toBeVisible({ timeout: 10000 });
  });

  test('login -> dashboard flow', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'existing@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Your Progress')).toBeVisible({ timeout: 10000 });
  });

  test('invalid login shows error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});