import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('Login-State speichern', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    // Leere Auth-State speichern damit die Tests trotzdem laufen
    await page.context().storageState({ path: authFile });
    return;
  }

  await page.goto('/login');
  await page.getByRole('textbox').first().fill(email);
  await page.getByRole('textbox').nth(1).fill(password);
  await Promise.all([
    page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15_000 }),
    page.getByRole('button', { name: /Anmelden/i }).click(),
  ]);
  await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible({ timeout: 10_000 });

  await page.context().storageState({ path: authFile });
});
