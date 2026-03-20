import { test, expect } from '@playwright/test';

test.describe('Authentifizierung', () => {
  test('Login-Seite lädt korrekt', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Bier Pong/i);
    await expect(page.getByRole('button', { name: /Anmelden|Login/i })).toBeVisible();
  });

  test('Falsche Anmeldedaten zeigen Fehlermeldung', async ({ page }) => {
    await page.goto('/login');

    // Labels sind divs, keine <label>-Elemente — per Reihenfolge ansprechen
    await page.getByRole('textbox').first().fill('nicht@vorhanden.de');
    await page.getByRole('textbox').nth(1).fill('falschespasswort');
    await page.getByRole('button', { name: /Anmelden/i }).click();

    // Fehlermeldung kann variieren je nach Server-Implementierung
    await expect(
      page.getByText(/Ungültige|ungültig|falsch|schiefgelaufen|incorrect|invalid/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('Registrierungsseite ist erreichbar', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('button', { name: /Registrieren|Erstellen/i })).toBeVisible();
  });

  test('Echter Login funktioniert', async ({ page }) => {
    // Wird nur ausgeführt wenn E2E_USER_EMAIL und E2E_USER_PASSWORD gesetzt sind
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }

    await page.goto('/login');
    await page.getByRole('textbox').first().fill(email);
    await page.getByRole('textbox').nth(1).fill(password);
    await page.getByRole('button', { name: /Anmelden/i }).click();

    await expect(page.locator('.bottom-nav')).toBeVisible({ timeout: 8000 });
  });
});
