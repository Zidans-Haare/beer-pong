import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { computeInsights, type InsightMatch } from './stats-insights';

const P = (id: string, isGuest = false) => ({ id, name: id.toUpperCase(), isGuest });
let n = 0;
// Spiel a gegen b; Reihenfolge = Aufrufreihenfolge innerhalb des Turniers
const match = (a: string, b: string, s1: number, s2: number, opts: Partial<InsightMatch> = {}): InsightMatch => ({
    id: `m${++n}`, tournamentId: 't1', tournamentName: 'Turnier 1', date: new Date('2026-01-01T20:00:00Z'),
    bracket: false, round: n, position: 0, p1: P(a), p2: P(b), score1: s1, score2: s2,
    winnerId: s1 > s2 ? a : b, durationSeconds: null, ...opts,
});
const player = (r: ReturnType<typeof computeInsights>, id: string) => r.players.find(p => p.id === id)!;

describe('computeInsights', () => {
    it('zählt den direkten Vergleich aus beiden Blickwinkeln', () => {
        const r = computeInsights([match('a', 'b', 10, 4), match('b', 'a', 10, 8), match('a', 'b', 10, 0)]);
        expect(player(r, 'a').opponents[0]).toMatchObject({ opponentId: 'b', wins: 2, losses: 1, cupsFor: 28, cupsAgainst: 14 });
        expect(player(r, 'b').opponents[0]).toMatchObject({ opponentId: 'a', wins: 1, losses: 2, cupsFor: 14, cupsAgainst: 28 });
    });

    it('bestimmt Angst- und Lieblingsgegner erst ab drei Duellen', () => {
        const two = computeInsights([match('a', 'b', 10, 1), match('a', 'b', 10, 2)]);
        expect(player(two, 'a').favoriteId).toBeNull();
        const three = computeInsights([match('a', 'b', 10, 1), match('a', 'b', 10, 2), match('a', 'b', 10, 3)]);
        expect(player(three, 'a').favoriteId).toBe('b');
        expect(player(three, 'b').nemesisId).toBe('a');
        expect(player(three, 'a').nemesisId).toBeNull();
    });

    it('liefert Form (letzte fünf, ältestes zuerst), aktuelle und längste Serie', () => {
        const r = computeInsights([
            match('a', 'b', 10, 1), match('a', 'b', 10, 1), match('a', 'b', 10, 1),
            match('b', 'a', 10, 1), match('a', 'b', 10, 1), match('a', 'b', 10, 1),
        ]);
        const a = player(r, 'a');
        expect(a.form).toEqual(['W', 'W', 'L', 'W', 'W']);
        expect(a.currentStreak).toEqual({ type: 'W', count: 2 });
        expect(a.longestWinStreak).toBe(3);
        expect(player(r, 'b').currentStreak).toEqual({ type: 'L', count: 2 });
    });

    it('sortiert chronologisch nach Turnierdatum, auch bei vertauschter Eingabe', () => {
        const late = match('a', 'b', 0, 10, { tournamentId: 't2', date: new Date('2026-02-01T20:00:00Z') });
        const early = match('a', 'b', 10, 0);
        expect(player(computeInsights([late, early]), 'a').form).toEqual(['W', 'L']);
    });

    it('lässt Gäste aus Vergleich und Rekorden heraus', () => {
        const r = computeInsights([match('a', 'g', 10, 0, { p2: P('g', true) }), match('a', 'b', 10, 5)]);
        expect(r.players.map(p => p.id).sort()).toEqual(['a', 'b']);
        expect(player(r, 'a').opponents.map(o => o.opponentId)).toEqual(['b']);
        // eigenes Spiel gegen den Gast zählt für Form und Serie
        expect(player(r, 'a').form).toEqual(['W', 'W']);
    });

    it('ermittelt die Rekorde', () => {
        const r = computeInsights([
            match('a', 'b', 10, 2, { durationSeconds: 600 }),
            match('a', 'c', 10, 9, { durationSeconds: 1500 }),
            match('b', 'c', 10, 0, { durationSeconds: 30 }), // unplausibel kurz
        ]);
        const rec = Object.fromEntries(r.records.map(x => [x.key, x]));
        expect(rec.winStreak).toMatchObject({ player: 'A', count: 2 });
        expect(rec.biggestWin).toMatchObject({ player: 'B', opponent: 'C', score: '10:0' });
        expect(rec.cupsInTournament).toMatchObject({ player: 'A', cups: 20, games: 2 });
        expect(rec.longestMatch).toMatchObject({ player: 'A', opponent: 'C', minutes: 25 });
    });

    it('liefert ohne Spiele leere Ergebnisse', () => {
        expect(computeInsights([])).toEqual({ players: [], records: [] });
    });
});
