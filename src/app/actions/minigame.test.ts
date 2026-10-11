import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

// Echte Datenbank in einer Wegwerf-Datei, aufgebaut aus den Migrationen des Projekts
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minigame-'));
const file = path.join(dir, 'test.db');
process.env.DATABASE_URL = `file:${file}`;

let currentUser = 'user-nick';
const pushed: { userId: string; title: string; message: string; link?: string }[] = [];
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/auth', () => ({ auth: async () => ({ user: { id: currentUser } }) }));
vi.mock('@/lib/push', () => ({ sendPushToUser: async (userId: string, title: string, message: string, link?: string) => { pushed.push({ userId, title, message, link }); return { success: true }; } }));

const replay = (rounds = 3) => JSON.stringify(Array.from({ length: rounds * 2 }, (_, i) => ({ r: Math.floor(i / 2), result: { kind: 'hit', cupId: i, bounce: false }, island: false, trick: false })));

beforeAll(() => {
    const db = new Database(file);
    const root = path.resolve(__dirname, '../../../prisma/migrations');
    for (const name of fs.readdirSync(root).filter(n => /^\d+_/.test(n)).sort()) db.exec(fs.readFileSync(path.join(root, name, 'migration.sql'), 'utf8'));
    const user = db.prepare("insert into User (id, name, email, status) values (?, ?, ?, 'ACTIVE')");
    const player = db.prepare("insert into Player (id, name, userId, isGuest, updatedAt) values (?, ?, ?, 0, CURRENT_TIMESTAMP)");
    user.run('user-nick', 'Nick', 'nick@test'); player.run('p-nick', 'Nick', 'user-nick');
    user.run('user-paul', 'Paul', 'paul@test'); player.run('p-paul', 'Paul', 'user-paul');
    db.prepare("insert into User (id, name, email, status) values ('user-wait', 'Wait', 'wait@test', 'PENDING')").run();
    player.run('p-wait', 'Wait', 'user-wait');
    db.close();
});

describe('Minispiel-Aktionen', () => {
    it('legt ein Duell an und benachrichtigt den Gegner mit Link', async () => {
        const { createDuel } = await import('./minigame');
        currentUser = 'user-nick';
        const res = await createDuel({ opponentPlayerId: 'p-paul', replay: replay(4), starter: 'CHALLENGER', challengerHand: 'rock', opponentHand: 'scissors' });
        expect(res.success).toBe(true);
        const { prisma } = await import('@/lib/prisma');
        const game = await prisma.miniGame.findFirst({ where: { mode: 'DUEL' } });
        expect(game).toMatchObject({ status: 'PENDING', challengerId: 'p-nick', opponentId: 'p-paul', starter: 'CHALLENGER', challengerRounds: 4, challengerHits: 8 });
        expect(pushed.at(-1)).toMatchObject({ userId: 'user-paul', link: `/game?duel=${game!.id}` });
        expect(pushed.at(-1)!.message).toContain('Nick will ein Duell');
    });

    it('lehnt ungültige Duelle ab', async () => {
        const { createDuel } = await import('./minigame');
        currentUser = 'user-nick';
        const base = { replay: replay(2), starter: 'CHALLENGER' as const, challengerHand: 'rock', opponentHand: 'paper' };
        expect((await createDuel({ ...base, opponentPlayerId: 'p-nick' })).success).toBe(false);
        expect((await createDuel({ ...base, opponentPlayerId: 'p-wait' })).success).toBe(false);
        expect((await createDuel({ ...base, opponentPlayerId: 'nobody' })).success).toBe(false);
        expect((await createDuel({ ...base, opponentPlayerId: 'p-paul', replay: 'kaputt' })).success).toBe(false);
        expect((await createDuel({ ...base, opponentPlayerId: 'p-paul', challengerHand: 'lizard' })).success).toBe(false);
    });

    it('erlaubt höchstens fünf offene Duelle', async () => {
        const { createDuel } = await import('./minigame');
        currentUser = 'user-nick';
        const results = [];
        for (let i = 0; i < 6; i++) results.push(await createDuel({ opponentPlayerId: 'p-paul', replay: replay(2), starter: 'OPPONENT', challengerHand: 'paper', opponentHand: 'rock' }));
        expect(results.filter(r => r.success)).toHaveLength(4);
        expect(results.at(-1)).toMatchObject({ success: false });
    });

    it('nur der Eingeladene kann nachziehen; der Herausforderer wird benachrichtigt', async () => {
        const { completeDuel } = await import('./minigame');
        const { prisma } = await import('@/lib/prisma');
        const game = (await prisma.miniGame.findFirst({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } }))!;
        const result = { won: true, rounds: 3, hits: 10, challengerRounds: 4, challengerHits: 8, nakedMile: null };
        currentUser = 'user-nick';
        expect((await completeDuel(game.id, result)).success).toBe(false);
        currentUser = 'user-paul';
        expect((await completeDuel(game.id, result)).success).toBe(true);
        expect((await completeDuel(game.id, result)).success).toBe(false);
        const done = await prisma.miniGame.findUnique({ where: { id: game.id } });
        expect(done).toMatchObject({ status: 'COMPLETED', winner: 'OPPONENT', opponentRounds: 3, opponentHits: 10, challengerRounds: 4 });
        expect(pushed.at(-1)).toMatchObject({ userId: 'user-nick', title: 'Duell verloren' });
    });

    it('lehnt ein Duell ab', async () => {
        const { declineDuel } = await import('./minigame');
        const { prisma } = await import('@/lib/prisma');
        const game = (await prisma.miniGame.findFirst({ where: { status: 'PENDING' } }))!;
        currentUser = 'user-nick';
        expect((await declineDuel(game.id)).success).toBe(false);
        currentUser = 'user-paul';
        expect((await declineDuel(game.id)).success).toBe(true);
        expect((await prisma.miniGame.findUnique({ where: { id: game.id } }))!.status).toBe('DECLINED');
        expect(pushed.at(-1)).toMatchObject({ userId: 'user-nick', title: 'Duell abgelehnt' });
    });

    it('hält Spiele gegen den Rechner fest und rechnet sie in die Statistik ein', async () => {
        const { recordCpuGame } = await import('./minigame');
        const { getMiniGameStats } = await import('@/lib/minigame/stats-server');
        currentUser = 'user-nick';
        await recordCpuGame({ difficulty: 'hard', won: true, rounds: 5, hits: 10, opponentRounds: 4, opponentHits: 7, nakedMile: null });
        await recordCpuGame({ difficulty: 'nonsense', won: false, rounds: 6, hits: 8, opponentRounds: 6, opponentHits: 10, nakedMile: null });
        const stats = await getMiniGameStats();
        const nick = stats.find(r => r.name === 'Nick')!;
        const paul = stats.find(r => r.name === 'Paul')!;
        // Nick: zwei Rechnerspiele (ein Sieg) und ein verlorenes Duell; Paul: ein gewonnenes Duell
        expect(nick).toMatchObject({ games: 3, wins: 1, duels: 1, duelWins: 0, bestRounds: 5 });
        expect(paul).toMatchObject({ games: 1, wins: 1, duels: 1, duelWins: 1, bestRounds: 3, hits: 10 });
        expect(stats[0].name).toBe('Paul');
        const { prisma } = await import('@/lib/prisma');
        expect((await prisma.miniGame.findMany({ where: { mode: 'CPU' }, orderBy: { createdAt: 'asc' } })).map(g => g.difficulty)).toEqual(['hard', 'normal']);
    });
    it('ein angenommenes Duell, das nicht zu Ende gespielt wird, zählt als verloren', async () => {
        const { startDuel, forfeitDuel, completeDuel, declineDuel } = await import('./minigame');
        const { prisma } = await import('@/lib/prisma');
        const game = (await prisma.miniGame.findFirst({ where: { status: 'PENDING', mode: 'DUEL' }, orderBy: { createdAt: 'asc' } }))!;
        // nur der Eingeladene kann annehmen, und nur einmal
        currentUser = 'user-nick';
        expect((await startDuel(game.id)).success).toBe(false);
        currentUser = 'user-paul';
        expect((await startDuel(game.id)).success).toBe(true);
        expect((await startDuel(game.id)).success).toBe(false);
        expect((await prisma.miniGame.findUnique({ where: { id: game.id } }))!.status).toBe('PLAYING');
        // ein laufendes Duell lässt sich nicht mehr ablehnen und zählt weiter als offen
        expect((await declineDuel(game.id)).success).toBe(false);
        // aufgeben: verloren, der Herausforderer gewinnt und wird benachrichtigt
        currentUser = 'user-nick';
        expect((await forfeitDuel(game.id)).success).toBe(false);
        currentUser = 'user-paul';
        expect((await forfeitDuel(game.id)).success).toBe(true);
        expect((await forfeitDuel(game.id)).success).toBe(false);
        expect(await prisma.miniGame.findUnique({ where: { id: game.id } })).toMatchObject({ status: 'COMPLETED', winner: 'CHALLENGER', opponentHits: 0, opponentRounds: game.challengerRounds });
        expect(pushed.at(-1)).toMatchObject({ userId: 'user-nick', title: 'Duell gewonnen' });
        // danach lässt es sich nicht mehr nachträglich als gewonnen melden
        expect((await completeDuel(game.id, { won: true, rounds: 1, hits: 10, challengerRounds: 4, challengerHits: 8, nakedMile: null })).success).toBe(false);
    });
});
