import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

// Den „Neu in der App“-Hinweis als gesehen vormerken, sonst legt er sich über jeden Test (e2e/whats-new.spec.ts testet ihn selbst)
const markWhatsNewSeen = (page: import('@playwright/test').Page) => page.evaluate(() => window.localStorage.setItem('whats-new-seen', '2026-11'));

setup('Login-State speichern', async ({ page }) => {
  setup.setTimeout(process.env.E2E_MODE === 'isolated' ? 180_000 : 60_000);
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    // Leere Auth-State speichern damit die Tests trotzdem laufen
    await page.context().storageState({ path: authFile });
    return;
  }

  // Der Entwicklungsserver lädt die Seite direkt nach dem Absenden manchmal neu (Fast Refresh). Dann ist man zwar
  // angemeldet, bleibt aber auf /login stehen. Deshalb nach dem Absenden die Startseite aufrufen und bis zu
  // dreimal versuchen.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login');
    await page.waitForLoadState('load');
    if (new URL(page.url()).pathname.includes('/login')) {
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.getByRole('button', { name: /Anmelden/i }).click();
      await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 }).catch(() => undefined);
    }
    await page.goto('/');
    await page.waitForLoadState('load');
    if (!new URL(page.url()).pathname.includes('/login')) break;
    if (attempt === 3) throw new Error('Anmeldung nach drei Versuchen nicht gelungen');
  }
  await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible({ timeout: 10_000 });

  await markWhatsNewSeen(page);
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
      await markWhatsNewSeen(rolePage);
      await context.storageState({ path: path.join(__dirname, `.auth/${role}.json`) });
      await context.close();
    }
  }
});
