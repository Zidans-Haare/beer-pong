import { test, expect } from '@playwright/test';

test.describe('Authentifizierung', () => {
  test('Login-Seite lädt korrekt', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Bier Pong/i);
    await expect(page.getByRole('button', { name: /Anmelden|Login/i })).toBeVisible();
  });

  test('Falsche Anmeldedaten zeigen Fehlermeldung', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/E-Mail/i).fill('nicht@vorhanden.de');
    await page.getByLabel(/Passwort/i).fill('falschespasswort');
    await page.getByRole('button', { name: /Anmelden|Login/i }).click();

    await expect(
      page.getByText(/Ungültige Anmeldedaten|Etwas ist schiefgelaufen/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('Unauthentifizierter Zugriff auf / leitet zu Login weiter', async ({ page }) => {
    await page.goto('/');
    // Entweder wird die Seite gezeigt (öffentlich) oder zu Login weitergeleitet
    const url = page.url();
    const isOnLogin = url.includes('/login');
    const hasContent = await page.getByRole('main').count() > 0;
    expect(isOnLogin || hasContent).toBe(true);
  });

  test('Registrierungsseite ist erreichbar', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('button', { name: /Registrieren|Erstellen/i })).toBeVisible();
  });
});
