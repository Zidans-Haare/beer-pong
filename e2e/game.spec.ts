import { test, expect } from '@playwright/test';
import { cupMouth } from '../src/lib/minigame/aim';
import { tablePoint } from '../src/lib/wrapped-scene';
import { slotsOf } from '../src/lib/minigame/engine';

const isolated = process.env.E2E_MODE === 'isolated';

test.describe('Regeln und Minispiel', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  test('Regeln-Seite zeigt die Hausregeln und führt zum Minispiel', async ({ page }) => {
    await page.goto('/rules');
    await expect(page.getByRole('heading', { name: 'Offizielles Regelwerk' })).toBeVisible();
    for (const heading of ['Grundlagen', 'Treffer und Sonderwürfe', 'Becher umstellen', 'Das Ende eines Spiels', 'Strafen und Spaß', 'Minispiel in der App', 'Fair Play']) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
    await expect(page.getByText('Bombe:')).toBeVisible();
    await expect(page.getByText('Nackte Meile:')).toBeVisible();
    await page.getByRole('link', { name: /Minispiel/ }).click();
    await expect(page).toHaveURL(/\/game$/);
  });

  test('Spiel starten, Schnick Schnack Schnuck, werfen', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error' || msg.type() === 'warning') console.log('CONSOLE', msg.type(), msg.text().slice(0, 300)); });
    await page.goto('/game');
    await expect(page.getByRole('heading', { name: 'Bier-Pong-Minispiel' })).toBeVisible();
    // Standard ist das Duell; hier geht es gegen den Rechner
    await expect(page.getByRole('radio', { name: 'Duell' })).toBeChecked();
    await page.getByRole('radio', { name: 'Gegen Computer' }).click();
    await expect(page.getByRole('radio', { name: 'Normal' })).toBeChecked();
    await page.getByRole('radio', { name: 'Leicht' }).click();
    await page.getByRole('button', { name: 'Zufälliger Gegner' }).click();

    // Schnick, Schnack, Schnuck, bei Gleichstand von vorn
    const canvas = page.locator('canvas.game-canvas');
    await expect(canvas).toBeVisible();
    const aimHint = page.getByText(/Nach vorn wischen/);
    for (let i = 0; i < 6 && !(await aimHint.isVisible()); i++) {
      const stone = page.getByRole('button', { name: /Stein/ });
      if (await stone.isVisible()) await stone.dispatchEvent('click');
      await page.waitForTimeout(3600);
    }

    // irgendwann bin ich dran (der Gegner wirft vorher, falls er anfängt)
    await expect(aimHint).toBeVisible({ timeout: 40_000 });
    // die Szene ist gezeichnet
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(540, 1500, 1, 1).data[3])).toBe(255);
    await expect(page.getByRole('button', { name: 'Aufpraller' })).toBeVisible();

    // Wischen: von unten schnell nach vorn über den Tisch, Loslassen wirft
    const box = (await canvas.boundingBox())!;
    const startX = box.x + box.width * 0.5, startY = box.y + box.height * 0.9;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.screenshot({ path: 'test-results/game-aiming.png' });
    for (let i = 1; i <= 6; i++) { await page.mouse.move(startX, startY - (box.height * 0.35 * i) / 6); await page.waitForTimeout(12); }
    await page.mouse.up();
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'test-results/game-flight.png' });
    await expect(aimHint).toBeHidden();
    // nach dem Wurf geht es weiter: zweiter Wurf, Trickshot-Angebot oder der Gegner ist dran
    await expect(page.locator('.game-hint, .game-controls .game-row').first()).toBeVisible({ timeout: 30_000 });
    expect(errors).toEqual([]);

    // beenden führt zurück zur Auswahl
    await page.getByRole('button', { name: 'Spiel beenden' }).click();
    await expect(page.getByRole('heading', { name: 'Bier-Pong-Minispiel' })).toBeVisible();
  });
});

test.describe('Vorlegen', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  test('Duell starten: Der Herausforderer legt vor und wirft auf einen vollen Tisch', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/game');
    await expect(page.getByRole('radio', { name: 'Duell' })).toBeChecked();
    // im Duell gibt es keine Schwierigkeit und keinen Zufallsgegner
    await expect(page.getByRole('radio', { name: 'Leicht' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Zufälliger Gegner' })).toHaveCount(0);
    await page.locator('.game-players button').first().click();

    const aimHint = page.getByText(/Nach vorn wischen/);
    for (let i = 0; i < 6 && !(await aimHint.isVisible()); i++) {
      const stone = page.getByRole('button', { name: /Stein/ });
      if (await stone.isVisible()) await stone.dispatchEvent('click');
      await page.waitForTimeout(3600);
    }
    await expect(aimHint).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.sr-only[aria-live]')).toContainText('Dein Wurf');
    // beim Vorlegen sitzt niemand gegenüber: nichts zum Umstellen und keine Aufpraller (niemand könnte wegschlagen)
    await expect(page.getByRole('button', { name: 'Becher umstellen' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Aufpraller' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('Vorlegen bis zum Ende', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  test('alle Becher treffen: Das Duell wird angelegt und der Gegner benachrichtigt', async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const { default: Database } = await import('better-sqlite3');
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readdirSync('e2e/.auth').filter(f => /^isolated-\d+\.db$/.test(f)).sort().pop()!;
    const open = () => new Database(path.join('e2e/.auth', file));
    let db = open();
    db.prepare('delete from MiniGame').run();
    db.close();

    await page.goto('/game');
    const opponentName = ((await page.locator('.game-players button').first().innerText()) || '').trim();
    await page.locator('.game-players button').first().click();

    const aimHint = page.getByText(/Nach vorn wischen/);
    for (let i = 0; i < 6 && !(await aimHint.isVisible()); i++) {
      const stone = page.getByRole('button', { name: /Stein/ });
      if (await stone.isVisible()) await stone.dispatchEvent('click');
      await page.waitForTimeout(3600);
    }
    // zehn Becher in fünf Runden: jeden Wurf genau in die Öffnung des nächsten Bechers
    const spots = Array.from({ length: 10 }, (_, i) => i).reverse().map(i => {
      const rows = [4, 3, 2, 1];
      let index = i, row = 0;
      while (index >= rows[row]) { index -= rows[row]; row++; }
      const count = rows[row];
      const mouth = cupMouth({ u: (index - (count - 1) / 2) * 0.235, v: 0.945 - row * 0.066 });
      return { x: mouth.x, y: mouth.y };
    });
    for (const spot of spots) {
      await expect(aimHint).toBeVisible({ timeout: 30_000 });
      // Test-Haken der Entwicklung: genau in die Öffnung werfen, statt zu wischen
      expect(await page.evaluate(point => (window as unknown as { __bpThrow: (p: { x: number; y: number }) => boolean }).__bpThrow(point), spot)).toBe(true);
      await expect(aimHint).toBeHidden();
    }

    await expect(page.locator('.sr-only[aria-live]')).toContainText(`Duell an ${opponentName} gesendet`, { timeout: 60_000 });
    db = open();
    const game = db.prepare("select * from MiniGame where mode = 'DUEL'").get() as Record<string, unknown>;
    const note = db.prepare("select n.title, n.message, n.link from Notification n join User u on u.id = n.userId join Player p on p.userId = u.id where p.name = ? order by n.createdAt desc").get(opponentName) as Record<string, string>;
    db.close();
    expect(game).toMatchObject({ status: 'PENDING', challengerRounds: 5, challengerHits: 10 });
    expect(JSON.parse(game.replay as string)).toHaveLength(10);
    expect(note.title).toBe('Duell-Herausforderung');
    expect(note.link).toBe(`/game?duel=${game.id}`);
    // in der Liste erscheint, auf wen noch gewartet wird
    await page.getByRole('button', { name: 'Spiel beenden' }).click();
    await expect(page.getByText(`${opponentName} hat noch nicht nachgezogen`)).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('Zurückrollen', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  test('rollt der Ball nach dem Rand über die Mittellinie zurück, folgt ein Trickshot-Angebot; sonst nicht', async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/game');
    await page.getByRole('radio', { name: 'Gegen Computer' }).click();
    await page.getByRole('radio', { name: 'Leicht' }).click();
    await page.getByRole('button', { name: 'Zufälliger Gegner' }).click();
    const aimHint = page.getByText(/Nach vorn wischen/);
    for (let i = 0; i < 6 && !(await aimHint.isVisible()); i++) {
      const stone = page.getByRole('button', { name: /Stein/ });
      if (await stone.isVisible()) await stone.dispatchEvent('click');
      await page.waitForTimeout(3600);
    }
    await expect(aimHint).toBeVisible({ timeout: 90_000 });
    // knapp neben die Öffnung der Spitze: Rand
    const tip = cupMouth(slotsOf('opp', 1).find(s => s.id === 9)!);
    const rim = { x: tip.x + 44 * tip.scale * 1.3, y: tip.y };
    const throwAt = async (random: number) => {
      await expect(aimHint).toBeVisible({ timeout: 60_000 });
      await page.evaluate(value => { (window as unknown as { __realRandom?: () => number }).__realRandom ??= Math.random; Math.random = () => value; }, random);
      expect(await page.evaluate(p => (window as unknown as { __bpThrow: (q: { x: number; y: number }) => boolean }).__bpThrow(p), rim)).toBe(true);
    };
    const restore = () => page.evaluate(() => { const w = window as unknown as { __realRandom?: () => number }; if (w.__realRandom) Math.random = w.__realRandom; });

    // Zufall 0.05 < 0.2: zurückgerollt, also Trickshot-Angebot
    await throwAt(0.05);
    await expect(page.getByRole('button', { name: 'Auslassen' })).toBeVisible({ timeout: 30_000 });
    await restore();
    await page.getByRole('button', { name: 'Auslassen' }).click();

    // Zufall 0.9 > 0.2: bleibt vor der Mittellinie liegen, kein Angebot (zweiter Wurf kommt, bei einer Runde erst dann der Gegner)
    await throwAt(0.9);
    await restore();
    await page.waitForTimeout(3000);
    await expect(page.getByRole('button', { name: 'Auslassen' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('Umstellen', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  test('bei vier Bechern der Gegenseite zu Beginn der Runde auf die zehn Plätze umstellen, nur einmal', async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/game');
    await page.locator('.game-players button').first().click();
    const aimHint = page.getByText(/Nach vorn wischen/);
    for (let i = 0; i < 6 && !(await aimHint.isVisible()); i++) {
      const stone = page.getByRole('button', { name: /Stein/ });
      if (await stone.isVisible()) await stone.dispatchEvent('click');
      await page.waitForTimeout(3600);
    }
    const throwAt = async (point: { x: number; y: number }) => {
      await expect(aimHint).toBeVisible({ timeout: 30_000 });
      expect(await page.evaluate(p => (window as unknown as { __bpThrow: (q: { x: number; y: number }) => boolean }).__bpThrow(p), point)).toBe(true);
      await expect(aimHint).toBeHidden();
    };
    const mouth = (id: number) => {
      const slot = slotsOf('opp', 1).find(s => s.id === id)!;
      return cupMouth(slot);
    };
    const rearrangeButton = page.getByRole('button', { name: /Becher umstellen/ });

    // fünf Becher: erst ab vier ist Umstellen erlaubt, mit zehn, acht, sechs gibt es den Knopf nicht
    for (const id of [9, 8, 7, 6]) { await throwAt(mouth(id)); }
    await expect(aimHint).toBeVisible({ timeout: 30_000 });
    await expect(rearrangeButton).toHaveCount(0);
    // Runde mit fünf und vier: dritte Runde, zwei Treffer (5 und 4): mitten in der Runde gibt es den Knopf nicht
    await throwAt(mouth(5));
    await expect(rearrangeButton).toHaveCount(0);
    await throwAt(mouth(4));
    // Balls back, jetzt stehen vier Becher (0 bis 3): das ist noch derselbe Zug, umstellen geht noch nicht
    await expect(aimHint).toBeVisible({ timeout: 30_000 });
    await expect(rearrangeButton).toHaveCount(0);
    // zwei Fehlwürfe beenden den Zug, der Computer spielt; danach bin ich wieder dran und darf umstellen
    await throwAt({ x: 20, y: 700 });
    await throwAt({ x: 20, y: 700 });
    await expect(aimHint).toBeVisible({ timeout: 60_000 });
    await expect(rearrangeButton).toBeVisible();
    await rearrangeButton.click();
    await expect(page.getByText(/freien Platz/)).toBeVisible();

    const canvas = page.locator('canvas.game-canvas');
    const box = (await canvas.boundingBox())!;
    const toPage = (p: { x: number; y: number }) => ({ x: box.x + (p.x / 1080) * box.width, y: box.y + (p.y / 1920) * box.height });
    const body = (slot: { u: number; v: number }) => { const p = tablePoint(slot.u, slot.v); return toPage({ x: p.x, y: p.y - 55 * p.scale }); };
    const slots = slotsOf('opp', 1);
    const click = async (point: { x: number; y: number }) => { await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.up(); };

    // Becher 0 antippen, dann den Platz an der Spitze (9)
    await click(body(slots[0]));
    await click(body(slots[9]));
    const moved = await page.evaluate(() => (window as unknown as { __bpGame: () => { cups: { opp: { id: number; u: number; v: number }[] } } }).__bpGame().cups.opp.find(c => c.id === 0));
    expect(moved!.u).toBeCloseTo(slots[9].u, 5);
    expect(moved!.v).toBeCloseTo(slots[9].v, 5);

    // ein Becher lässt sich auch ziehen: Becher 1 auf Platz 7
    await page.mouse.move(body(slots[1]).x, body(slots[1]).y);
    await page.mouse.down();
    await page.mouse.move(body(slots[7]).x, body(slots[7]).y, { steps: 6 });
    await page.mouse.up();
    const dragged = await page.evaluate(() => (window as unknown as { __bpGame: () => { cups: { opp: { id: number; u: number; v: number }[] } } }).__bpGame().cups.opp.find(c => c.id === 1));
    expect(dragged!.v).toBeCloseTo(slots[7].v, 5);

    await page.getByRole('button', { name: 'Fertig' }).click();
    await expect(aimHint).toBeVisible({ timeout: 30_000 });
    // nur einmal pro Spiel
    await expect(rearrangeButton).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe('Profil', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  test('zeigt die Minispiel-Bilanz mit Computer-Stufen, Duellen und direktem Vergleich', async ({ page }) => {
    const { default: Database } = await import('better-sqlite3');
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readdirSync('e2e/.auth').filter(f => /^isolated-\d+\.db$/.test(f)).sort().pop()!;
    const db = new Database(path.join('e2e/.auth', file));
    db.prepare('delete from MiniGame').run();
    const insert = db.prepare("insert into MiniGame (id, mode, status, difficulty, cupSize, challengerId, opponentId, challengerRounds, opponentRounds, challengerHits, opponentHits, winner, completedAt, createdAt) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    const at = '2026-10-10T10:00:00.000+00:00';
    insert.run('p1', 'CPU', 'COMPLETED', 'hard', 'medium', 'e2e-host-player', null, 8, 7, 10, 9, 'CHALLENGER', at, at);
    insert.run('p2', 'CPU', 'COMPLETED', 'easy', 'small', 'e2e-host-player', null, 9, 5, 7, 10, 'OPPONENT', at, at);
    insert.run('p3', 'DUEL', 'COMPLETED', null, 'large', 'e2e-host-player', 'e2e-player-player', 4, 6, 10, 8, 'CHALLENGER', '2026-10-11T10:00:00.000+00:00', at);
    insert.run('p4', 'DUEL', 'COMPLETED', null, 'small', 'e2e-player-player', 'e2e-host-player', 5, 7, 10, 9, 'CHALLENGER', '2026-10-12T10:00:00.000+00:00', at);
    db.close();

    await page.goto('/players/e2e-host-player');
    const section = page.getByRole('region', { name: 'Minispiel' });
    await expect(section).toBeVisible();
    // Gesamt: vier Spiele, zwei Siege
    await expect(section.locator('.pg-box').filter({ hasText: 'Spiele' }).locator('strong')).toHaveText('4');
    await expect(section.locator('.pg-box').filter({ hasText: 'Siege' }).locator('strong')).toHaveText('2');
    await expect(section.locator('.pg-box').filter({ hasText: 'Beste Runden' }).locator('strong')).toHaveText('4');
    // Computer nach Stufe
    await expect(section.getByText('Gegen den Computer')).toBeVisible();
    await expect(section.locator('.pg-list div').filter({ hasText: 'Schwer' }).locator('dd')).toContainText('1/1');
    await expect(section.locator('.pg-list div').filter({ hasText: 'Leicht' }).locator('dd')).toContainText('0/1');
    // Duelle: ein Sieg beim Vorlegen, eine Niederlage beim Nachziehen
    await expect(section.locator('.pg-list div').filter({ hasText: 'Als Herausforderer' }).locator('dd')).toHaveText('1/1');
    await expect(section.locator('.pg-list div').filter({ hasText: 'Als Nachziehender' }).locator('dd')).toHaveText('0/1');
    // direkter Vergleich und letzte Duelle, neueste zuerst
    await expect(section.locator('.pg-rivals li').first()).toContainText('1:1');
    const recent = section.locator('.pg-recent li');
    await expect(recent).toHaveCount(2);
    await expect(recent.first()).toContainText('Niederlage');
    await expect(recent.first()).toContainText('nachgezogen');
    await expect(recent.first()).toContainText('Runden 7:5');
    await expect(recent.nth(1)).toContainText('Sieg');
    await expect(recent.nth(1)).toContainText('große Becher');

  });
});

test.describe('Duell', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  // Duell, bei dem der Gegner in fünf Runden alle Becher getroffen hat
  const replay = [[9, 8], [7, 6], [5, 4], [3, 2], [1, 0]].flatMap(([a, b], r) => [a, b].map(cupId => ({ r, result: { kind: 'hit', cupId, bounce: false }, island: false, trick: false })));

  test('offenes Duell annehmen und gegen die Aufzeichnung spielen, Bilanz auf der Stats-Seite', async ({ page }) => {
    const { default: Database } = await import('better-sqlite3');
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readdirSync('e2e/.auth').filter(f => /^isolated-\d+\.db$/.test(f)).sort().pop()!;
    const db = new Database(path.join('e2e/.auth', file));
    db.prepare("delete from MiniGame").run();
    db.prepare("insert into MiniGame (id, mode, status, challengerId, opponentId, starter, challengerHand, opponentHand, challengerRounds, challengerHits, replay) values ('duel-1', 'DUEL', 'PENDING', 'e2e-player-player', 'e2e-host-player', 'CHALLENGER', 'rock', 'scissors', 5, 10, ?)").run(JSON.stringify(replay));
    db.prepare("insert into MiniGame (id, mode, status, challengerId, opponentId, winner, challengerRounds, opponentRounds, challengerHits, opponentHits, completedAt) values ('done-1', 'DUEL', 'COMPLETED', 'e2e-host-player', 'e2e-player-player', 'CHALLENGER', 4, 6, 10, 8, '2026-10-10T10:00:00.000+00:00')").run();
    db.close();

    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    // in der Liste erscheint die Herausforderung
    await page.goto('/game');
    await expect(page.getByRole('heading', { name: 'Herausforderungen für dich' })).toBeVisible();
    await page.getByRole('link', { name: /will ein Duell/ }).click();
    await expect(page).toHaveURL(/\/game\?duel=duel-1$/);
    await expect(page.getByRole('heading', { name: 'Duell' })).toBeVisible();
    await expect(page.getByText(/fängt an/)).toBeVisible();

    await page.getByRole('button', { name: 'Annehmen', exact: true }).click();
    const canvas = page.locator('canvas.game-canvas');
    await expect(canvas).toBeVisible();
    // Der Herausforderer fängt an und hat in jeder Runde beide Bälle versenkt (Balls back), also spielt er alle
    // fünf Runden hintereinander. Danach ziehe ich einmal nach.
    test.setTimeout(180_000);
    await expect(page.getByText(/Nach vorn wischen/)).toBeVisible({ timeout: 120_000 });
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(540, 1500, 1, 1).data[3])).toBe(255);
    await expect(page.locator('.sr-only[aria-live]')).toContainText('Dein Wurf');
    // beim Nachziehen darf nicht umgestellt werden
    await expect(page.getByRole('button', { name: /Becher umstellen/ })).toHaveCount(0);
    expect(errors).toEqual([]);

    // Bilanz in der Statistik
    await page.goto('/stats');
    await expect(page.getByRole('heading', { name: 'Minispiel' })).toBeVisible();
    await expect(page.getByRole('row', { name: /Alex/ }).or(page.getByRole('row').first())).toBeVisible();
  });

  test('Duell ablehnen', async ({ page }) => {
    const { default: Database } = await import('better-sqlite3');
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readdirSync('e2e/.auth').filter(f => /^isolated-\d+\.db$/.test(f)).sort().pop()!;
    const db = new Database(path.join('e2e/.auth', file));
    db.prepare("delete from MiniGame where id in ('duel-1', 'duel-2')").run();
    db.prepare("insert into MiniGame (id, mode, status, challengerId, opponentId, starter, challengerHand, opponentHand, challengerRounds, challengerHits, replay) values ('duel-2', 'DUEL', 'PENDING', 'e2e-player-player', 'e2e-host-player', 'OPPONENT', 'paper', 'rock', 5, 10, ?)").run(JSON.stringify(replay));
    db.close();
    await page.goto('/game?duel=duel-2');
    await expect(page.getByText(/Du fängst an/)).toBeVisible();
    await page.getByRole('button', { name: 'Ablehnen' }).click();
    await expect(page).toHaveURL(/\/game$/);
    await expect(page.getByRole('link', { name: /will ein Duell/ })).toHaveCount(0);
  });
  // legt ein offenes Duell an und liest später den Stand aus der Test-Datenbank
  const withDb = async <T,>(run: (db: import('better-sqlite3').Database) => T): Promise<T> => {
    const { default: Database } = await import('better-sqlite3');
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readdirSync('e2e/.auth').filter(f => /^isolated-\d+\.db$/.test(f)).sort().pop()!;
    const db = new Database(path.join('e2e/.auth', file));
    try { return run(db); } finally { db.close(); }
  };
  const insertDuel = (id: string) => withDb(db => {
    db.prepare('delete from MiniGame where id = ?').run(id);
    db.prepare("insert into MiniGame (id, mode, status, challengerId, opponentId, starter, challengerHand, opponentHand, challengerRounds, challengerHits, replay) values (?, 'DUEL', 'PENDING', 'e2e-player-player', 'e2e-host-player', 'OPPONENT', 'paper', 'rock', 5, 10, ?)").run(id, JSON.stringify(replay));
  });
  const duelRow = (id: string) => withDb(db => db.prepare('select status, winner, opponentHits from MiniGame where id = ?').get(id) as { status: string; winner: string | null; opponentHits: number | null });

  test('Kreuz mitten im Duell: nach Bestätigung aufgegeben, das Duell zählt als verloren', async ({ page }) => {
    await insertDuel('duel-3');
    await page.goto('/game?duel=duel-3');
    await page.getByRole('button', { name: 'Annehmen', exact: true }).click();
    await expect(page.locator('canvas.game-canvas')).toBeVisible();
    expect((await duelRow('duel-3')).status).toBe('PLAYING');
    await page.getByRole('button', { name: 'Spiel beenden' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/zählt das Duell als verloren/)).toBeVisible();
    // „Abbrechen“ lässt das Duell weiterlaufen
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.locator('canvas.game-canvas')).toBeVisible();
    expect((await duelRow('duel-3')).status).toBe('PLAYING');
    await page.getByRole('button', { name: 'Spiel beenden' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Aufgeben' }).click();
    await expect(page).toHaveURL(/\/game$/, { timeout: 30_000 });
    await expect(page.getByRole('link', { name: /will ein Duell/ })).toHaveCount(0);
    expect(await duelRow('duel-3')).toMatchObject({ status: 'COMPLETED', winner: 'CHALLENGER', opponentHits: 0 });
  });

  test('Seite mitten im Duell neu laden: das Duell zählt als aufgegeben und lässt sich nicht neu starten', async ({ page }) => {
    await insertDuel('duel-4');
    await page.goto('/game?duel=duel-4');
    await page.getByRole('button', { name: 'Annehmen', exact: true }).click();
    await expect(page.locator('canvas.game-canvas')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('dialog').getByText(/nicht zu Ende gespielt/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
    await expect(page).toHaveURL(/\/game$/, { timeout: 30_000 });
    expect(await duelRow('duel-4')).toMatchObject({ status: 'COMPLETED', winner: 'CHALLENGER' });
    // der alte Link führt nicht mehr zum Duell
    await page.goto('/game?duel=duel-4');
    await expect(page.getByRole('button', { name: 'Annehmen', exact: true })).toHaveCount(0);
  });
  test('nach dem Nachziehen bleibt das Ergebnisbild stehen', async ({ page }) => {
    test.setTimeout(240_000);
    await insertDuel('duel-5');
    await page.goto('/game?duel=duel-5');
    await page.getByRole('button', { name: 'Annehmen', exact: true }).click();
    const aimHint = page.getByText(/Nach vorn wischen/);
    await expect(aimHint).toBeVisible({ timeout: 150_000 });
    // zweimal daneben: Das Duell ist verloren und wird gespeichert
    for (let i = 0; i < 2; i++) {
      await expect(aimHint).toBeVisible({ timeout: 30_000 });
      expect(await page.evaluate(p => (window as unknown as { __bpThrow: (q: { x: number; y: number }) => boolean }).__bpThrow(p), { x: 20, y: 700 })).toBe(true);
      await expect(aimHint).toBeHidden();
    }
    const anotherOpponent = page.getByRole('button', { name: 'Anderer Gegner' });
    await expect(anotherOpponent).toBeVisible({ timeout: 60_000 });
    await expect.poll(async () => (await duelRow('duel-5')).status, { timeout: 30_000 }).toBe('COMPLETED');
    // Die Seite lädt nach dem Speichern neu (Duell nicht mehr offen), springt aber nicht zur Übersicht zurück
    await page.waitForTimeout(6000);
    await expect(page).toHaveURL(/\/game\?duel=duel-5$/);
    await expect(anotherOpponent).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Herausforderungen für dich' })).toHaveCount(0);
  });
  test('Verlängerung: beide räumen ab, ich spiele die drei Becher allein, der andere zieht danach nach und entscheidet', async ({ page, browser }) => {
    test.setTimeout(600_000);
    await insertDuel('duel-6');
    await withDb(db => db.prepare("update MiniGame set starter = 'CHALLENGER', challengerHand = 'rock', opponentHand = 'scissors' where id = 'duel-6'").run());
    await page.goto('/game?duel=duel-6');
    await page.getByRole('button', { name: 'Annehmen', exact: true }).click();
    const aimHint = page.getByText(/Nach vorn wischen/);
    const throwAt = async (point: { x: number; y: number }) => {
      await expect(aimHint).toBeVisible({ timeout: 150_000 });
      expect(await page.evaluate(p => (window as unknown as { __bpThrow: (q: { x: number; y: number }) => boolean }).__bpThrow(p), point)).toBe(true);
      await expect(aimHint).toBeHidden();
    };
    const mouth = (id: number) => cupMouth(slotsOf('opp', 1).find(s => s.id === id)!);
    // Der Herausforderer hat alles abgeräumt. Ich ziehe nach und räume in einem Zug ebenfalls alle zehn (Balls back nach jedem Paar).
    for (const id of [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]) await throwAt(mouth(id));
    // Verlängerung: Ich spiele die drei Becher allein (Spitze und die zwei dahinter)
    await expect.poll(() => page.evaluate(() => { const g = (window as unknown as { __bpGame: () => { overtime: number; cups: { me: unknown[]; opp: unknown[] } } }).__bpGame(); return `${g.overtime}:${g.cups.me.length}:${g.cups.opp.length}`; }), { timeout: 60_000 }).toBe('1:3:3');
    expect((await withDb(db => db.prepare("select status from MiniGame where id = 'duel-6'").get() as { status: string })).status).toBe('PLAYING');
    for (const id of [9, 8, 7]) await throwAt(mouth(id));
    await throwAt({ x: 20, y: 700 });
    // Das Duell bleibt offen, die Verlängerung wartet auf den anderen
    await expect.poll(() => withDb(db => db.prepare("select status from MiniGame where id = 'duel-6'").get() as { status: string }).then(r => r.status), { timeout: 30_000 }).toBe('OVERTIME');
    const stage = await withDb(db => db.prepare("select id, status, challengerId, opponentId, starter, stage, parentId from MiniGame where parentId = 'duel-6'").get() as { id: string; status: string; challengerId: string; opponentId: string; starter: string; stage: number; parentId: string });
    expect(stage).toMatchObject({ status: 'PENDING', challengerId: 'e2e-host-player', opponentId: 'e2e-player-player', starter: 'OPPONENT', stage: 1, parentId: 'duel-6' });

    // Der andere öffnet die Verlängerung: kein Ablehnen, er fängt an, spielt zweimal daneben und verliert
    const context = await browser.newContext({ ...test.info().project.use, storageState: 'e2e/.auth/player.json' });
    const other = await context.newPage();
    await other.goto(`/game?duel=${stage.id}`);
    await expect(other.getByRole('heading', { name: 'Verlängerung' })).toBeVisible();
    await expect(other.getByRole('button', { name: 'Ablehnen' })).toHaveCount(0);
    await other.getByRole('button', { name: 'Annehmen', exact: true }).click();
    const otherHint = other.getByText(/Nach vorn wischen/);
    for (let i = 0; i < 2; i++) {
      await expect(otherHint).toBeVisible({ timeout: 60_000 });
      expect(await other.evaluate(p => (window as unknown as { __bpThrow: (q: { x: number; y: number }) => boolean }).__bpThrow(p), { x: 20, y: 700 })).toBe(true);
      await expect(otherHint).toBeHidden();
    }
    // Ich räume die drei Becher in zwei Runden ab und bin als Zweiter damit sofort durch
    await expect(other.getByRole('button', { name: 'Anderer Gegner' })).toBeVisible({ timeout: 60_000 });
    // das ursprüngliche Duell ist entschieden: Der Herausforderer des Duells (der andere) hat verloren, ich (Nachziehender) habe gewonnen
    await expect.poll(() => withDb(db => db.prepare("select status, winner from MiniGame where id = 'duel-6'").get() as { status: string; winner: string }), { timeout: 30_000 }).toMatchObject({ status: 'COMPLETED', winner: 'OPPONENT' });
    await context.close();
  });
});
