import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Navigation nach Login', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) { test.skip(); return; }
    await login(page, email, password);
  });

  test('Home-Seite nach Login erreichbar', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  test('Turniere-Seite erreichbar', async ({ page }) => {
    await page.goto('/tournaments');
    await expect(page).toHaveURL('/tournaments');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  test('Spieler-Seite erreichbar', async ({ page }) => {
    await page.goto('/players');
    await expect(page).toHaveURL('/players');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  test('Stats-Seite erreichbar', async ({ page }) => {
    await page.goto('/stats');
    await expect(page).toHaveURL('/stats');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });
});
