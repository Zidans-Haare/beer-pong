import { Page, expect } from '@playwright/test';

/**
 * Loggt einen Testuser ein und wartet bis die Weiterleitung abgeschlossen ist.
 * Prüft den Login über den Logout-Button in der Navbar (zuverlässiger als bottom-nav,
 * da der Button nach Server-Side-Render sofort sichtbar ist).
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  await Promise.all([
    page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 }),
    page.getByRole('button', { name: /Anmelden/i }).click(),
  ]);

  // Logout-Button bestätigt erfolgreichen Login (server-side gerendert)
  await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible({ timeout: 10000 });
}

export function requireIsolatedMode(page: Page) {
  if (process.env.E2E_MODE !== 'isolated') throw new Error('Mutation tests require an isolated server.');
  const target = new URL(page.url());
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.port === '3000') {
    throw new Error('Mutation tests cannot target an existing or external app.');
  }
}
