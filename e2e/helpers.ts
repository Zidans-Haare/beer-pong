import { Page, expect } from '@playwright/test';

/**
 * Loggt einen Testuser ein und wartet bis die Weiterleitung abgeschlossen ist.
 * Prüft den Login über den Logout-Button in der Navbar (zuverlässiger als bottom-nav,
 * da der Button nach Server-Side-Render sofort sichtbar ist).
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('textbox').first().fill(email);
  await page.getByRole('textbox').nth(1).fill(password);

  await Promise.all([
    page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 }),
    page.getByRole('button', { name: /Anmelden/i }).click(),
  ]);

  // Logout-Button bestätigt erfolgreichen Login (server-side gerendert)
  await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible({ timeout: 10000 });
}
