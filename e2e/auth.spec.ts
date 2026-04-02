import { test, expect } from '@playwright/test';

const hasCredentials = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe('Authentifizierung', () => {
  test('Login-Seite lädt korrekt', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await expect(page).toHaveTitle(/Beer Pong/i);
    await expect(page.getByRole('button', { name: /Anmelden/i })).toBeVisible();
  });

  test('Falsche Anmeldedaten zeigen Fehlermeldung', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByRole('textbox').first().fill('nicht@vorhanden.de');
    await page.getByRole('textbox').nth(1).fill('falschespasswort');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await expect(
      page.getByText(/Ungültige|ungültig|falsch|schiefgelaufen|incorrect|invalid/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('Leere Felder bleiben auf Login-Seite', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Registrierungsseite ist erreichbar', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/register');
    await expect(page.getByRole('button', { name: /Registrieren|Erstellen/i })).toBeVisible();
  });

  test('Geschützte Seite leitet zu Login weiter', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Echter Login funktioniert', async ({ page }) => {
    test.skip(!hasCredentials, 'Keine E2E-Zugangsdaten gesetzt');
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Logout funktioniert', async ({ page }) => {
    test.skip(!hasCredentials, 'Keine E2E-Zugangsdaten gesetzt');
    await page.goto('/');
    await page.getByRole('button', { name: /Logout/i }).click();
    // Nach Logout landet man auf / oder /login
    await page.waitForURL(url => url.pathname === '/' || url.pathname.includes('/login'), { timeout: 10_000 });
    const url = page.url();
    expect(url).toMatch(/\/(login)?$/);
  });
});
