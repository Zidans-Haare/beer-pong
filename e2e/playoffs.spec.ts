import { test, expect } from '@playwright/test';

const isolated = process.env.E2E_MODE === 'isolated';

test.describe('Playoffs', () => {
  test.skip(!isolated, 'Braucht die Testdaten der isolierten Umgebung');

  const withDb = async <T,>(run: (db: import('better-sqlite3').Database) => T): Promise<T> => {
    const { default: Database } = await import('better-sqlite3');
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readdirSync('e2e/.auth').filter(f => /^isolated-\d+\.db$/.test(f)).sort().pop()!;
    const db = new Database(path.join('e2e/.auth', file));
    try { return run(db); } finally { db.close(); }
  };

  test('das Finale lässt sich nur einmal erzeugen', async ({ page }) => {
    // Liga mit vier Spielern, alle Ligaspiele sind gespielt
    await withDb(db => {
      db.prepare("delete from Tournament where id = 'e2e-playoffs'").run();
      db.prepare("insert into Tournament (id, name, date, location, status, type, hostId, mode, isRanked, updatedAt) values ('e2e-playoffs', 'Playoff Liga', ?, 'Club House', 'ACTIVE', 'ROUND_ROBIN', 'e2e-host', 'SOLO', 1, CURRENT_TIMESTAMP)").run(new Date().toISOString());
      const players = ['e2e-host-player', 'e2e-player-player', 'e2e-extra-0', 'e2e-extra-1'];
      players.forEach((playerId, i) => {
        db.prepare("insert into TournamentParticipant (idString, tournamentId, playerId) values (?, 'e2e-playoffs', ?)").run(`e2e-playoffs-part-${i}`, playerId);
        db.prepare("insert into TournamentStanding (id, tournamentId, playerId, groupId) values (?, 'e2e-playoffs', ?, 0)").run(`e2e-playoffs-stand-${i}`, playerId);
      });
      let n = 0;
      for (let a = 0; a < players.length; a++) for (let b = a + 1; b < players.length; b++) {
        db.prepare("insert into Match (id, tournamentId, player1Id, player2Id, round, position, stage, isPlayed, score1, score2, winnerId, updatedAt) values (?, 'e2e-playoffs', ?, ?, ?, ?, 'LEAGUE', 1, 10, 4, ?, CURRENT_TIMESTAMP)").run(`e2e-playoffs-m-${n}`, players[a], players[b], 1 + Math.floor(n / 2), n, players[a]);
        n++;
      }
    });
    const bracketCount = () => withDb(db => (db.prepare("select count(*) as c from Match where tournamentId = 'e2e-playoffs' and stage = 'BRACKET'").get() as { c: number }).c);

    await page.goto('/tournaments/e2e-playoffs');
    const button = page.getByRole('button', { name: 'Finale starten' });
    await button.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Finale starten' }).click();
    // zwei Halbfinals, das Finale und das Spiel um Platz 3
    await expect.poll(bracketCount, { timeout: 30_000 }).toBe(4);
    // danach gibt es den Knopf nicht mehr
    await expect(button).toHaveCount(0, { timeout: 30_000 });
    await page.reload();
    await expect(button).toHaveCount(0);
    expect(await bracketCount()).toBe(4);
  });
});
