import { test, expect } from '@playwright/test';

const hasCredentials = !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe('Navigation nach Login', () => {
  test.skip(!hasCredentials, 'Keine E2E-Zugangsdaten gesetzt');

  test('Home-Seite nach Login erreichbar', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  test('Turniere-Seite erreichbar', async ({ page }) => {
    await page.goto('/tournaments');
    await expect(page).toHaveURL('/tournaments');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  test('Spieler-Seite erreichbar', async ({ page }) => {
    await page.goto('/players');
    await expect(page).toHaveURL('/players');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  test('Stats-Seite erreichbar', async ({ page }) => {
    await page.goto('/stats');
    await expect(page).toHaveURL('/stats');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  test('Einstellungen-Seite erreichbar', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  test('Regeln-Seite erreichbar', async ({ page }) => {
    await page.goto('/rules');
    await expect(page).toHaveURL('/rules');
  });

  test('Nicht vorhandene Seite gibt 404', async ({ page }) => {
    await page.goto('/diese-seite-gibt-es-nicht');
    const shows404 = await page.getByRole('heading', { name: /404/i }).count() > 0;
    expect(shows404).toBe(true);
  });
});

test.describe('Navigation ohne Login', () => {
  test('Startseite lädt (oder leitet zu Login)', async ({ page }) => {
    await page.goto('/');
    const url = page.url();
    expect(url).toMatch(/\/login|\//);
  });

  test('Admin-Bereich leitet zu Login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});
