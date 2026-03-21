import { test, expect } from '@playwright/test';

const hasCredentials = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe('Turniere (öffentlich)', () => {
  test('Turnier-Übersicht lädt oder leitet zu Login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/tournaments');
    const url = page.url();
    expect(url).toMatch(/\/tournaments|\/login/);
  });

  test('GET /api/tournaments/by-code/:code — ungültiger Code gibt Fehler', async ({ page }) => {
    const res = await page.request.get('/api/tournaments/by-code/INVALID123');
    expect([400, 401, 404]).toContain(res.status());
  });
});

test.describe('Turniere (eingeloggt)', () => {
  test.skip(!hasCredentials, 'Keine E2E-Zugangsdaten gesetzt');

  test('Turniere-Seite zeigt Heading', async ({ page }) => {
    await page.goto('/tournaments');
    await expect(page.getByRole('heading', { name: /Turniere/i })).toBeVisible();
  });

  test('Archiv-Seite erreichbar', async ({ page }) => {
    await page.goto('/tournaments/archive');
    await expect(page).toHaveURL('/tournaments/archive');
  });

  test('Neues Turnier erstellen — Seite erreichbar', async ({ page }) => {
    await page.goto('/tournaments/new');
    await expect(page).toHaveURL('/tournaments/new');
    await expect(page.getByRole('button', { name: /Erstellen|Speichern/i })).toBeVisible();
  });

  test('Ungültige Turnier-ID gibt 404', async ({ page }) => {
    const res = await page.goto('/tournaments/dieses-turnier-gibt-es-nicht-99999');
    expect(res?.status()).toBe(404);
  });

  test('Join-Seite mit falschem Code zeigt Fehler oder 404', async ({ page }) => {
    await page.goto('/join/XXXXXX');
    await page.waitForLoadState('load');
    const hasError = await page.getByText(/nicht gefunden|ungültig|fehler|not found/i).count() > 0;
    const redirected = !page.url().includes('/join/XXXXXX');
    expect(hasError || redirected).toBe(true);
  });
});
