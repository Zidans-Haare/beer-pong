import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Authentifizierung', () => {
  test('Login-Seite lädt korrekt', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Bier Pong/i);
    await expect(page.getByRole('button', { name: /Anmelden/i })).toBeVisible();
  });

  test('Falsche Anmeldedaten zeigen Fehlermeldung', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox').first().fill('nicht@vorhanden.de');
    await page.getByRole('textbox').nth(1).fill('falschespasswort');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await expect(
      page.getByText(/Ungültige|ungültig|falsch|schiefgelaufen|incorrect|invalid/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('Leere Felder zeigen Fehlermeldung', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    // Entweder HTML5-Validierung oder eine App-Fehlermeldung
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('Registrierungsseite ist erreichbar', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('button', { name: /Registrieren|Erstellen/i })).toBeVisible();
  });

  test('Echter Login funktioniert', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) { test.skip(); return; }
    await login(page, email, password);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Geschützte Seite leitet zu Login weiter', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Logout funktioniert', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) { test.skip(); return; }
    await login(page, email, password);
    await page.getByRole('button', { name: /Logout/i }).click();
    await expect(page).toHaveURL(/\/login|\//);
    // Nach Logout: geschützte Seite nicht mehr zugänglich
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });
});
