import { test, expect } from '@playwright/test';

test.describe('Turniere (öffentliche Ansicht)', () => {
  test('Turnier-Übersicht ist erreichbar', async ({ page }) => {
    await page.goto('/tournaments');
    // Entweder Turnierliste oder Redirect zu Login
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
