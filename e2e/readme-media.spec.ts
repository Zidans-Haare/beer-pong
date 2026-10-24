import { test, expect, type Browser, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { cupMouth } from '../src/lib/minigame/aim';
import { slotsOf } from '../src/lib/minigame/engine';

// Aufnahmen für das README: erzeugt kurze Videos in der isolierten Umgebung (nur erfundene Namen).
// Aufruf: RECORD_README=1 E2E_MODE=isolated npx playwright test e2e/readme-media.spec.ts --project=chromium
// Danach macht scripts/readme-gifs.sh daraus die GIFs in docs/media.
const OUT = path.join(__dirname, '..', 'test-results', 'readme-media');
const VIEW = { width: 390, height: 844 };

test.describe('README-Aufnahmen', () => {
  test.skip(!process.env.RECORD_README || process.env.E2E_MODE !== 'isolated', 'Nur auf Wunsch und in der isolierten Umgebung');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  async function record(browser: Browser, name: string, run: (page: Page) => Promise<void>, storageState = 'e2e/.auth/user.json') {
    fs.mkdirSync(OUT, { recursive: true });
    const context = await browser.newContext({ storageState, viewport: VIEW, recordVideo: { dir: OUT, size: VIEW } });
    // Entwicklungs-Hinweise von Next.js gehören nicht ins Video
    await context.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = 'nextjs-portal { display: none !important; }';
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
    });
    const page = await context.newPage();
    await run(page);
    await page.close();
    const video = page.video()!;
    await context.close();
    await video.saveAs(path.join(OUT, `${name}.webm`));
    await video.delete();
  }

  const settle = (page: Page, ms = 900) => page.waitForTimeout(ms);
  const scroll = async (page: Page, y: number, steps = 12) => {
    for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, y / steps); await page.waitForTimeout(45); }
  };

  test('Rundgang durch die App', async ({ browser }) => {
    await record(browser, 'tour', async page => {
      await page.goto('/');
      await settle(page, 1800);
      await scroll(page, 600);
      await settle(page);
      await page.goto('/tournaments');
      await settle(page, 1300);
      await page.goto('/tournaments/e2e-active');
      await settle(page, 1500);
      await scroll(page, 700);
      await settle(page, 1200);
      await page.goto('/stats');
      await settle(page, 1500);
      await scroll(page, 900);
      await settle(page, 1200);
    });
  });

  test('Minispiel im Stadion', async ({ browser }) => {
    await record(browser, 'minigame', async page => {
      await page.goto('/game');
      await settle(page, 700);
      await page.getByRole('radio', { name: /Computer/ }).click();
      await page.getByText('Normal', { exact: true }).click();
      await settle(page, 500);
      await page.locator('.game-players button').nth(1).click();
      const aimHint = page.getByText(/Nach vorn wischen/);
      for (let i = 0; i < 6 && !(await aimHint.isVisible()); i++) {
        const stone = page.getByRole('button', { name: /Stein/ });
        if (await stone.isVisible()) { await settle(page, 600); await stone.click(); }
        await page.waitForTimeout(3600);
      }
      await expect(aimHint).toBeVisible({ timeout: 60_000 });
      const mouth = (id: number) => { const m = cupMouth(slotsOf('opp', 1)[id]); return { x: m.x, y: m.y }; };
      // zweimal derselbe Becher: Bombe, das Publikum springt auf, danach Balls back
      for (const id of [9, 9, 4, 0]) {
        await expect(aimHint).toBeVisible({ timeout: 30_000 });
        await settle(page, 400);
        await page.evaluate(q => (window as unknown as { __bpThrow: (p: { x: number; y: number }) => boolean }).__bpThrow(q), mouth(id));
        await page.waitForTimeout(400);
      }
      await settle(page, 2500);
    });
  });

  test('Turnierfilm', async ({ browser }) => {
    await record(browser, 'film', async page => {
      await page.goto('/tournaments/e2e-completed/film');
      await page.waitForTimeout(17_000);
    });
  });

  test('Siegerehrung auf dem Podest', async ({ browser }) => {
    await record(browser, 'podium', async page => {
      await page.goto('/tournaments/e2e-completed');
      await page.waitForTimeout(7_500);
    });
  });

  test('Wrapped', async ({ browser }) => {
    // veröffentlichter Rückblick für das laufende Jahr, direkt in der isolierten Datenbank
    const { databasePath } = JSON.parse(fs.readFileSync(path.join(__dirname, '.auth', 'isolated.json'), 'utf8')) as { databasePath: string };
    const db = new Database(databasePath);
    const iso = (d: Date) => d.toISOString().replace('Z', '+00:00');
    const year = new Date().getFullYear();
    db.prepare('insert or replace into Wrapped (id, title, startDate, endDate, publishedAt, createdAt) values (?, ?, ?, ?, ?, ?)')
      .run('readme-wrapped', `Wrapped ${year}`, iso(new Date(Date.UTC(year, 0, 1))), iso(new Date(Date.UTC(year, 11, 31, 23, 59))), iso(new Date()), iso(new Date()));
    db.close();
    await record(browser, 'wrapped', async page => {
      await page.goto('/wrapped?id=readme-wrapped');
      await page.waitForTimeout(19_000);
    });
  });

  test('Chat', async ({ browser }) => {
    await record(browser, 'chat', async page => {
      await page.goto('/chat');
      await settle(page, 1200);
      const input = page.locator('.chat-composer textarea');
      for (const text of ['Wer ist heute Abend dabei?', 'Ich bring die Becher mit', 'Und wer verliert, läuft die nackte Meile']) {
        await input.pressSequentially(text, { delay: 35 });
        await settle(page, 250);
        await input.press('Enter');
        await settle(page, 700);
      }
      await settle(page, 1500);
    });
  });

  test('Figur und Hintergründe', async ({ browser }) => {
    await record(browser, 'themes', async page => {
      await page.goto('/players/e2e-host-player/figure');
      await settle(page, 1500);
      await page.getByRole('radio', { name: 'Lang' }).click();
      await settle(page, 500);
      await page.getByRole('radio', { name: 'Kappe' }).click();
      await settle(page, 900);
      const picker = page.getByRole('radiogroup', { name: 'Hintergrund deiner Szenen' });
      await picker.scrollIntoViewIfNeeded();
      await settle(page, 800);
      for (const theme of ['Strand', 'Club', 'Kneipe', 'Stadion']) {
        await picker.getByRole('radio', { name: theme }).click();
        await settle(page, 1300);
      }
    });
  });
});
