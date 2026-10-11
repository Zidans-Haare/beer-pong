import { test, expect } from '@playwright/test';

const isolated = process.env.E2E_MODE === 'isolated';

test.describe('App-Nutzung und Online-Anzeige', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  const withDb = async <T,>(run: (db: import('better-sqlite3').Database) => T): Promise<T> => {
    const { default: Database } = await import('better-sqlite3');
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readdirSync('e2e/.auth').filter(f => /^isolated-\d+\.db$/.test(f)).sort().pop()!;
    const db = new Database(path.join('e2e/.auth', file));
    try { return run(db); } finally { db.close(); }
  };
  const installed = () => withDb(db => (db.prepare("select pwaInstalled as p from User where id = 'e2e-host'").get() as { p: number }).p);

  test('als App vom Startbildschirm geöffnet wird der Nutzer als „installiert“ vermerkt', async ({ page }) => {
    await withDb(db => db.prepare("update User set pwaInstalled = 0 where id = 'e2e-host'").run());
    expect(await installed()).toBe(0);
    // so tut der Browser, als läge die App im eigenen Fenster
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => query.includes('display-mode: standalone')
        ? ({ matches: true, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false } as MediaQueryList)
        : original(query);
    });
    await page.goto('/rules');
    await expect.poll(installed, { timeout: 30_000 }).toBe(1);
  });

  test('im normalen Browser wird nichts vermerkt', async ({ page }) => {
    await withDb(db => db.prepare("update User set pwaInstalled = 0 where id = 'e2e-host'").run());
    await page.goto('/rules');
    await page.waitForTimeout(2500);
    expect(await installed()).toBe(0);
  });

  test('auf jeder Seite wird der Herzschlag gesendet, nicht nur auf der Startseite', async ({ page }) => {
    const [request] = await Promise.all([
      page.waitForRequest(r => r.url().includes('/api/presence') && r.method() === 'POST', { timeout: 30_000 }),
      page.goto('/rules'),
    ]);
    expect(request.method()).toBe('POST');
    // wer gerade eine Seite offen hat, ist online
    await expect.poll(async () => (await (await page.request.get('/api/presence')).json()).count, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  });
});
