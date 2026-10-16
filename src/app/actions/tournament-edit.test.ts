import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

// Echte Datenbank in einer Wegwerf-Datei, aufgebaut aus den Migrationen des Projekts
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tournament-edit-'));
const file = path.join(dir, 'test.db');
process.env.DATABASE_URL = `file:${file}`;

let currentUser = 'user-host';
const pushed: { userId: string; title: string; message: string }[] = [];
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/auth', () => ({ auth: async () => ({ user: { id: currentUser, email: `${currentUser}@test` } }) }));
vi.mock('@/lib/push', () => ({ sendPushToUser: async (userId: string, title: string, message: string) => { pushed.push({ userId, title, message }); return { success: true }; } }));

let db: Database.Database;
beforeAll(() => {
    db = new Database(file);
    const root = path.resolve(__dirname, '../../../prisma/migrations');
    for (const name of fs.readdirSync(root).filter(n => /^\d+_/.test(n)).sort()) db.exec(fs.readFileSync(path.join(root, name, 'migration.sql'), 'utf8'));
    const user = db.prepare("insert into User (id, name, email, status) values (?, ?, ?, 'ACTIVE')");
    const player = db.prepare('insert into Player (id, name, userId, isGuest, updatedAt) values (?, ?, ?, ?, CURRENT_TIMESTAMP)');
    for (const [id, name] of [['host', 'Nick'], ['roy', 'Roy'], ['tom', 'Tom'], ['other', 'Moonzy']]) {
        user.run(`user-${id}`, name, `user-${id}@test`);
        player.run(`p-${id}`, name, `user-${id}`, 0);
    }
    player.run('p-guest', 'Gast', null, 1);
});

const base = { name: 'Geburtstag', date: '2026-12-24T18:30:00.000Z', location: 'Bei Nick', tableCount: 2, mode: 'SOLO' as const, type: 'SINGLE_ELIMINATION' as const, hasReturnLeg: false, isRanked: false };

function seed(status = 'PLANNED', mode = 'TEAM') {
    db.exec('delete from Team; delete from RSVP; delete from GuestPlayer; delete from Tournament;');
    db.prepare("insert into Tournament (id, name, date, location, status, type, hostId, mode, updatedAt) values ('t1', 'Alt', ?, 'Club', ?, 'SINGLE_ELIMINATION', 'user-host', ?, CURRENT_TIMESTAMP)").run(Date.parse('2026-12-20T18:00:00Z'), status, mode);
    const rsvp = db.prepare("insert into RSVP (id, tournamentId, playerId, status) values (?, 't1', ?, ?)");
    rsvp.run('r1', 'p-host', 'YES'); rsvp.run('r2', 'p-roy', 'YES'); rsvp.run('r3', 'p-tom', 'NO');
    db.prepare("insert into Team (id, tournamentId, name, player1Id, player2Id) values ('team1', 't1', 'A', 'p-host', 'p-roy')").run();
}

describe('Turnier bearbeiten', () => {
    beforeEach(() => { pushed.length = 0; currentUser = 'user-host'; });

    it('der Host ändert Zeit, Ort, Modus und Tische und setzt die Spieler', async () => {
        seed();
        const { editTournament } = await import('./tournaments');
        // Roy raus, Tom (hatte abgesagt) und Moonzy rein, der Gast wird ignoriert
        const res = await editTournament('t1', { ...base, participantIds: ['p-host', 'p-tom', 'p-other', 'p-guest'] });
        expect(res).toEqual({ success: true });
        const t = db.prepare("select * from Tournament where id = 't1'").get() as Record<string, unknown>;
        // aus der Liga wird ein Spaß-Turnier
        expect(t).toMatchObject({ name: 'Geburtstag', location: 'Bei Nick', tableCount: 2, mode: 'SOLO', isRanked: 0 });
        expect(new Date(t.date as number).toISOString()).toBe(base.date);
        const yes = (db.prepare("select playerId from RSVP where tournamentId = 't1' and status = 'YES' order by playerId").all() as { playerId: string }[]).map(r => r.playerId);
        expect(yes).toEqual(['p-host', 'p-other', 'p-tom']);
        // ohne 2v2 gibt es keine Teams mehr
        expect(db.prepare('select count(*) as n from Team').get()).toEqual({ n: 0 });
        // Neue bekommen Bescheid, Roy war schon dabei und hört von der Änderung nichts mehr, weil er raus ist
        expect(pushed.filter(p => p.title === 'Du bist dabei!').map(p => p.userId).sort()).toEqual(['user-other', 'user-tom']);
        expect(pushed.filter(p => p.title === 'Turnier geändert').map(p => p.userId)).toEqual([]);
    });

    it('bei 2v2 verlässt nur das Team mit dem Entfernten das Turnier; Bisherige hören von neuer Zeit', async () => {
        seed();
        db.prepare("insert into RSVP (id, tournamentId, playerId, status) values ('r4', 't1', 'p-other', 'YES')").run();
        db.prepare("insert into Team (id, tournamentId, name, player1Id, player2Id) values ('team2', 't1', 'B', 'p-other', null)").run();
        const { editTournament } = await import('./tournaments');
        expect((await editTournament('t1', { ...base, mode: 'TEAM', participantIds: ['p-host', 'p-other'] })).success).toBe(true);
        expect((db.prepare('select id from Team').all() as { id: string }[]).map(r => r.id)).toEqual(['team2']);
        expect(pushed.filter(p => p.title === 'Turnier geändert').map(p => p.userId)).toEqual(['user-other']);
    });

    it('nur der Host und nur vor dem Start', async () => {
        seed();
        const { editTournament } = await import('./tournaments');
        currentUser = 'user-roy';
        expect((await editTournament('t1', { ...base, participantIds: [] })).success).toBe(false);
        currentUser = 'user-host';
        seed('ACTIVE');
        expect((await editTournament('t1', { ...base, participantIds: [] })).success).toBe(false);
        expect((db.prepare("select name from Tournament where id = 't1'").get() as { name: string }).name).toBe('Alt');
    });

    it('Spaß wird nur zur Liga, solange keine Gäste dabei sind', async () => {
        seed();
        db.exec("update Tournament set isRanked = 0 where id = 't1'");
        db.prepare("insert into GuestPlayer (id, name, tournamentId, sessionToken, expiresAt) values ('g1', 'Gast', 't1', 'tok', ?)").run(new Date(Date.now() + 86400000).toISOString().replace('Z', '+00:00'));
        const { editTournament } = await import('./tournaments');
        const blocked = await editTournament('t1', { ...base, isRanked: true, participantIds: ['p-host'] });
        expect(blocked.success).toBe(false);
        expect(blocked.error).toMatch(/Gäste/);
        expect((db.prepare("select isRanked from Tournament where id = 't1'").get() as { isRanked: number }).isRanked).toBe(0);
        db.exec('delete from GuestPlayer');
        expect((await editTournament('t1', { ...base, isRanked: true, participantIds: ['p-host'] })).success).toBe(true);
        expect((db.prepare("select isRanked from Tournament where id = 't1'").get() as { isRanked: number }).isRanked).toBe(1);
    });

    it('lehnt ungültige Angaben ab', async () => {
        seed();
        const { editTournament } = await import('./tournaments');
        expect((await editTournament('t1', { ...base, location: '  ', participantIds: [] })).success).toBe(false);
        expect((await editTournament('t1', { ...base, date: '2026-12-24T18:30', participantIds: [] })).success).toBe(false);
        expect((await editTournament('t1', { ...base, tableCount: 0, participantIds: [] })).success).toBe(false);
    });
});
