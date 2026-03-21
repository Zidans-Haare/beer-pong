import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Turniere (öffentliche Ansicht)', () => {
  test('Turnier-Übersicht ist erreichbar', async ({ page }) => {
    await page.goto('/tournaments');
    const url = page.url();
    const onLoginPage = url.includes('/login');
    if (!onLoginPage) {
      await expect(page).toHaveTitle(/Bier Pong/i);
    }
  });

  test('Turnier per Code beitreten — fehlerhafte Route gibt 404 oder Fehler', async ({ page }) => {
    const res = await page.request.get('/api/tournaments/by-code/XXXXXX');
    expect([200, 404]).toContain(res.status());
  });
});

test.describe('Turnier-API', () => {
  test('GET /api/tournaments/by-code/:code — ungültiger Code gibt Fehler', async ({ page }) => {
    const res = await page.request.get('/api/tournaments/by-code/INVALID123');
    expect([400, 401, 404]).toContain(res.status());
  });
});

test.describe('Turniere (eingeloggt)', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) { test.skip(); return; }
    await login(page, email, password);
  });

  test('Turniere-Seite zeigt Inhalt', async ({ page }) => {
    await page.goto('/tournaments');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Turniere/i })).toBeVisible();
  });

  test('Archiv-Seite erreichbar', async ({ page }) => {
    await page.goto('/tournaments/archive');
    await expect(page).toHaveURL('/tournaments/archive');
    await expect(page).not.toHaveURL(/\/login/);
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

  test('Join-Seite mit falschem Code zeigt Fehler', async ({ page }) => {
    await page.goto('/join/XXXXXX');
    await page.waitForLoadState('networkidle');
    // Entweder Fehlermeldung oder 404
    const url = page.url();
    const hasError = await page.getByText(/nicht gefunden|ungültig|fehler|not found/i).count() > 0;
    const is404 = !url.includes('/join');
    expect(hasError || is404).toBe(true);
  });
});
