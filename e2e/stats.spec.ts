import { test, expect } from '@playwright/test';

const hasCredentials = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe('Stats-Seite', () => {
  test.skip(!hasCredentials, 'Keine E2E-Zugangsdaten gesetzt');

  test('Stats-Seite lädt', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForLoadState('load');
    await expect(page).toHaveURL('/stats');
  });

  test('Keine JS-Fehler auf Stats-Seite', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/stats');
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });
});
