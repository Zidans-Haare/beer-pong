import { test, expect } from '@playwright/test';

test.describe('Navigation nach Login', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }

    await page.goto('/login');
    await page.getByRole('textbox').first().fill(email);
    await page.getByRole('textbox').nth(1).fill(password);
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await expect(page.locator('.bottom-nav')).toBeVisible({ timeout: 8000 });
  });

  test('Bottom Nav nach Login sichtbar', async ({ page }) => {
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('Home-Seite lädt', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.bottom-nav')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('Turniere-Seite erreichbar', async ({ page }) => {
    await page.goto('/tournaments');
    await expect(page).toHaveURL('/tournaments');
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('Spieler-Seite erreichbar', async ({ page }) => {
    await page.goto('/players');
    await expect(page).toHaveURL('/players');
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('Stats-Seite erreichbar', async ({ page }) => {
    await page.goto('/stats');
    await expect(page).toHaveURL('/stats');
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });
});
