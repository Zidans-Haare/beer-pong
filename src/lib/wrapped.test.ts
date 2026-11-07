import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { computeWrapped, buildScene, type WrappedExtras } from './wrapped';
import type { InsightMatch } from './stats-insights';

const P = (id: string, isGuest = false) => ({ id, name: id.toUpperCase(), isGuest });
let n = 0;
const match = (a: string, b: string, s1: number, s2: number, opts: Partial<InsightMatch> = {}): InsightMatch => ({
    id: `m${++n}`, tournamentId: 't1', tournamentName: 'Turnier 1', date: new Date('2026-01-01T20:00:00Z'),
    bracket: false, round: n, position: 0, p1: P(a), p2: P(b), score1: s1, score2: s2,
    winnerId: s1 > s2 ? a : b, durationSeconds: null, ...opts,
});
const extras = (ranking: string[] = [], medals: WrappedExtras['medals'] = new Map()): WrappedExtras => ({ ranking, medals });
const t = (key: string, values?: Record<string, string | number>) => key + (values ? JSON.stringify(values) : '');

describe('computeWrapped', () => {
    it('summiert Spiele, Becher, Minuten und Turniere', () => {
        const r = computeWrapped([
            match('a', 'b', 10, 4, { durationSeconds: 600 }),
            match('b', 'a', 10, 8, { durationSeconds: 900, tournamentId: 't2', tournamentName: 'Turnier 2' }),
            match('a', 'b', 10, 0, { durationSeconds: 20 }), // unplausible Dauer zählt nicht
        ], extras(['a', 'b']));
        const a = r.get('a')!;
        expect(a).toMatchObject({ games: 3, wins: 2, losses: 1, cupsHit: 28, cupsReceived: 14, tournaments: 2, minutes: 25, rank: 1, totalPlayers: 2 });
        expect(a.winRate).toBeCloseTo(2 / 3);
        expect(a.rival).toMatchObject({ name: 'B', games: 3, wins: 2, losses: 1 });
        expect(a.biggestWin).toMatchObject({ score: '10:0', opponent: 'B' });
        expect(a.cupsPercentile).toBe(100);
        expect(r.get('b')!.cupsPercentile).toBe(0);
    });

    it('übernimmt Medaillen und lässt Gäste aus', () => {
        const r = computeWrapped([match('a', 'g', 10, 0, { p2: P('g', true) })], extras(['a'], new Map([['a', { gold: 1, silver: 0, bronze: 2 }]])));
        expect([...r.keys()]).toEqual(['a']);
        expect(r.get('a')!.medals).toEqual({ gold: 1, silver: 0, bronze: 2 });
        expect(r.get('a')!.rival).toBeNull();
    });

    it('vergibt Newcomer bei wenigen Spielen und Vollstrecker bei hoher Quote', () => {
        const few = computeWrapped([match('a', 'b', 10, 0)], extras());
        expect(few.get('a')!.persona).toBe('rookie');
        const many = computeWrapped(Array.from({ length: 6 }, () => match('a', 'b', 10, 9)), extras());
        expect(many.get('a')!.persona).toBe('closer');
    });
});

describe('buildScene', () => {
    it('liefert immer die sieben Abschnitte in fester Reihenfolge', () => {
        const data = computeWrapped([match('a', 'b', 10, 3)], extras(['a', 'b'], new Map([['a', { gold: 2, silver: 1, bronze: 0 }]]))).get('a')!;
        const scene = buildScene(data, 'Wrapped 2026', '#006b50', t);
        expect(scene.segments.map(s => s.key)).toEqual(['table', 'setup', 'throw', 'rally', 'win', 'final']);
        // kein Abspann mehr
        expect(scene).not.toHaveProperty('outro');
        expect(scene.opponentName).toBe('B');
        expect(scene.segments[0].countTo).toBe(1);
        expect(scene.segments[4].countTo).toBe(1); // Siege
    });

    it('zeigt ohne festen Gegner die Turniere statt der Duelle', () => {
        const data = computeWrapped([match('a', 'g', 10, 0, { p2: P('g', true) })], extras(['a'])).get('a')!;
        const scene = buildScene(data, 'Wrapped 2026', '#006b50', t);
        expect(scene.opponentName).toBeNull();
        expect(scene.segments[1].eyebrow).toBe('tournamentsEyebrow');
        expect(scene.segments[1].countTo).toBe(1);
    });
});
