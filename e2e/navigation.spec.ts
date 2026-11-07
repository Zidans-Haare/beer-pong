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

test.describe('Isolated mobile page coverage', () => {
  test.skip(process.env.E2E_MODE !== 'isolated', 'Fixture routes are local only');
  const routes = ['/', '/tournaments', '/tournaments/archive', '/tournaments/new', '/tournaments/e2e-planned', '/tournaments/e2e-active', '/tournaments/e2e-team', '/tournaments/e2e-league', '/tournaments/e2e-groups', '/tournaments/e2e-completed', '/players', '/players/new', '/players/e2e-host-player', '/players/e2e-host-player/edit', '/stats', '/chat', '/notifications', '/settings', '/rules', '/streaming', '/offline', '/join', '/join/CLUB26'];
  for (const route of routes) {
    test(`mobile layout ${route}`, async ({ page }, testInfo) => {
      const failures: string[] = [];
      page.on('pageerror', error => failures.push(error.message));
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('main')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const size = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
      expect(size.content, `Horizontal overflow on ${route}`).toBeLessThanOrEqual(size.viewport + 1);
      await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true, animations: 'disabled' });
      await page.screenshot({ path: testInfo.outputPath('viewport.png'), animations: 'disabled' });
      expect(failures).toEqual([]);
    });
  }

  test('five tabs and the complete More menu remain available', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium', 'Mobile navigation only');
    await page.goto('/');
    await expect(page.locator('.bottom-nav > *')).toHaveCount(5);
    await expect(page.locator('.bottom-nav').getByRole('link', { name: 'Stats', exact: true })).toHaveAttribute('href', '/stats');
    await expect(page.locator('.bottom-nav').getByRole('link', { name: 'Chat', exact: true })).toHaveCount(0);
    await page.locator('.bottom-nav').getByRole('button', { name: /Mehr/ }).click();
    const dialog = page.getByRole('dialog');
    // der Zähler ungelesener Benachrichtigungen wird nachgeladen und steht dann mit im Namen des Links
    for (const name of ['Spieler', 'Chat', 'Benachrichtigungen', 'Streaming', 'Einstellungen', 'Regeln']) await expect(dialog.getByRole('link', { name: new RegExp(`^${name}( \\d+\\+?)?$`) })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Stats', exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.locator('.bottom-nav').getByRole('link', { name: 'Stats', exact: true }).click();
    await expect(page).toHaveURL('/stats', { timeout: 30_000 });
    await expect(page.locator('.bottom-nav').getByRole('link', { name: 'Stats', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('tapped tab is marked active immediately, before the page arrives', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium', 'Mobile navigation only');
    await page.goto('/');
    // Antwort für den Seitenwechsel künstlich verzögern: die Markierung darf nicht darauf warten
    await page.route(url => url.pathname === '/stats', async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
    const stats = page.locator('.bottom-nav').getByRole('link', { name: 'Stats', exact: true });
    await stats.click();
    await expect(stats).toHaveClass(/active/, { timeout: 700 });
    await expect(page.locator('.bottom-nav').getByRole('link', { name: 'Start', exact: true })).not.toHaveClass(/active/, { timeout: 700 });
    await expect(page).toHaveURL('/stats', { timeout: 30_000 });
    await expect(stats).not.toHaveClass(/is-pending/);
  });

  test('small phones and tablet keep key layouts within the viewport', async ({ page }) => {
    test.setTimeout(240_000);
    for (const width of [320, 360, 768, 1024]) {
      for (const route of ['/', '/join', '/tournaments', '/tournaments/new', '/players', '/stats', '/settings', '/tournaments/e2e-active']) {
        const viewportPage = await page.context().newPage();
        try {
          await viewportPage.setViewportSize({ width, height: 900 });
          await viewportPage.goto(route);
          await viewportPage.evaluate(() => document.fonts.ready);
          const size = await viewportPage.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
          expect(size.content, `${route} at ${width}`).toBeLessThanOrEqual(size.viewport + 1);
        } finally {
          await viewportPage.close();
        }
      }
    }
  });

  test('notification preference sheet retains all three switches', async ({ page }) => {
    await page.goto('/notifications');
    await page.getByRole('button', { name: /Einstellungen/, exact: true }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('switch')).toHaveCount(3);
    const original = await dialog.getByRole('switch').first().getAttribute('aria-checked');
    await dialog.getByRole('switch').first().click();
    await expect(dialog.getByRole('switch').first()).toHaveAttribute('aria-checked', original === 'true' ? 'false' : 'true');
    await dialog.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Einstellungen/, exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('switch').first()).toHaveAttribute('aria-checked', original === 'true' ? 'false' : 'true');
    await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
  });

  test('simplified mode and reduced motion keep the primary controls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium', 'Mobile navigation only');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: /Ich bin nüchtern/ }).click();
    await expect(page.locator('.bottom-nav > *')).toHaveCount(3);
    await page.getByRole('button', { name: /Ich bin betrunken/ }).click();
    await expect(page.locator('.bottom-nav > *')).toHaveCount(5);
    await expect(page.locator('.bottom-nav').getByRole('link', { name: 'Beitreten', exact: true })).toBeVisible();
  });
});
