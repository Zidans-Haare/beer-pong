import { test, expect } from '@playwright/test';

const hasCredentials = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe('Spieler-Seite', () => {
  test.skip(!hasCredentials, 'Keine E2E-Zugangsdaten gesetzt');

  test('Spielerliste lädt', async ({ page }) => {
    await page.goto('/players');
    await page.waitForLoadState('load');
    const hasContent = await page.locator('.glass-panel').count() > 0;
    expect(hasContent).toBe(true);
  });

  test('Spieler-Detailseite erreichbar', async ({ page }) => {
    await page.goto('/players');
    await page.waitForLoadState('load');
    const firstLink = page.locator('a[href^="/players/"]').first();
    const exists = await firstLink.count() > 0;
    if (!exists) { test.skip(); return; }
    await firstLink.click();
    await expect(page).toHaveURL(/\/players\/.+/);
  });

  test('Neuer-Spieler-Seite erreichbar', async ({ page }) => {
    await page.goto('/players/new');
    await expect(page).toHaveURL('/players/new');
    await expect(page.getByRole('button', { name: /Speichern|Erstellen|Hinzufügen|Anlegen/i })).toBeVisible();
  });

  test('Ungültige Spieler-ID gibt 404', async ({ page }) => {
    await page.goto('/players/dieser-spieler-existiert-nicht-12345');
    const shows404 = await page.getByRole('heading', { name: /404/i }).count() > 0;
    expect(shows404).toBe(true);
  });
});
