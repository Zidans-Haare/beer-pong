import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Stats-Seite', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) { test.skip(); return; }
    await login(page, email, password);
  });

  test('Stats-Seite lädt korrekt', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForLoadState('load');
    await expect(page).toHaveURL('/stats');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Keine JS-Fehler auf Stats-Seite', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/stats');
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });
});
