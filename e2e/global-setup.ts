import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('Login-State speichern', async ({ page }) => {
  setup.setTimeout(process.env.E2E_MODE === 'isolated' ? 180_000 : 60_000);
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    // Leere Auth-State speichern damit die Tests trotzdem laufen
    await page.context().storageState({ path: authFile });
    return;
  }

  await page.goto('/login');
  await page.waitForLoadState('load');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await Promise.all([
    page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15_000 }),
    page.getByRole('button', { name: /Anmelden/i }).click(),
  ]);
  await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible({ timeout: 10_000 });

  await page.context().storageState({ path: authFile });

  if (process.env.E2E_MODE === 'isolated') {
    for (const role of ['admin', 'player']) {
      const context = await page.context().browser()!.newContext();
      const rolePage = await context.newPage();
      await rolePage.goto(new URL('/login', page.url()).href);
      await rolePage.locator('input[type="email"]').fill(`${role}@matchday.test`);
      await rolePage.locator('input[type="password"]').fill(password);
      await Promise.all([
        rolePage.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 }),
        rolePage.getByRole('button', { name: /Anmelden/i }).click(),
      ]);
      await context.storageState({ path: path.join(__dirname, `.auth/${role}.json`) });
      await context.close();
    }
  }
});
