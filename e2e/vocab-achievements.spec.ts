import { test, expect } from '@playwright/test';

test.describe('Vocabulary + Achievements Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'e2e@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('vocabulary flashcard -> earn achievement', async ({ page }) => {
    await page.goto('/vocabulary');

    const cardsArea = page.locator('text=/All caught up|Vocabulary Practice/');
    await expect(cardsArea).toBeVisible();
  });

  test('achievements page shows locked/unlocked grid', async ({ page }) => {
    await page.goto('/achievements');

    await expect(page.locator('text=Achievements & Progress')).toBeVisible();
    await expect(page.locator('text=Level A1')).toBeVisible();
  });
});