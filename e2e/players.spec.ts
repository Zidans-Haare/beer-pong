import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Spieler-Seite', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) { test.skip(); return; }
    await login(page, email, password);
  });

  test('Spielerliste lädt', async ({ page }) => {
    await page.goto('/players');
    await page.waitForLoadState('networkidle');
    // Entweder Spielerkarten oder Leer-Hinweis sichtbar
    const hasPlayers = await page.locator('.glass-panel').count() > 0;
    expect(hasPlayers).toBe(true);
  });

  test('Spieler-Detailseite erreichbar', async ({ page }) => {
    await page.goto('/players');
    await page.waitForLoadState('networkidle');
    const firstLink = page.locator('a[href^="/players/"]').first();
    const exists = await firstLink.count() > 0;
    if (!exists) { test.skip(); return; }
    await firstLink.click();
    await expect(page).toHaveURL(/\/players\/.+/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Neuer-Spieler-Seite erreichbar', async ({ page }) => {
    await page.goto('/players/new');
    await expect(page).toHaveURL('/players/new');
    await expect(page.getByRole('button', { name: /Speichern|Erstellen|Hinzufügen/i })).toBeVisible();
  });

  test('Ungültige Spieler-ID gibt 404', async ({ page }) => {
    const res = await page.goto('/players/dieser-spieler-existiert-nicht-12345');
    expect(res?.status()).toBe(404);
  });
});
