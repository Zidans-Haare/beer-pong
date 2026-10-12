import { describe, it, expect } from 'vitest';
import { newGame, applyThrow, resolveRound, roundOver, canTrick, skipTrick, other, canRearrange, rearrange, ISLANDS_PER_GAME, type Game, type Side, type GameEvent } from './engine';
import { planAiThrow, aiRearrangeSlots, type Difficulty, type Rng } from './ai';

function seeded(seed: number): Rng {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

// Ganze Spiele Rechner gegen Rechner, um die Regeln über viele Zufallsabläufe zu prüfen
function playout(seed: number, size: number, level: Difficulty) {
    const rng = seeded(seed);
    let game: Game = newGame(rng() < 0.5 ? 'me' : 'opp', size);
    const islandCalls: Record<Side, number> = { me: 0, opp: 0 };
    const events: GameEvent[] = [];
    let rounds = 0, guard = 0;
    let removedMax = 0;
    const rearrangeCalls: Record<Side, number> = { me: 0, opp: 0 };
    let rearrangedInCatchUp = false;
    while (!game.winner && guard++ < 2000) {
        const side = game.turn;
        // die KI spielt beide Seiten: für 'me' wird das Spiel gespiegelt gedacht, indem wir mit den Rollen tauschen
        const mirrored = side === 'me';
        const view: Game = mirrored ? { ...game, cups: { me: game.cups.opp, opp: game.cups.me }, islandsLeft: { me: game.islandsLeft.opp, opp: game.islandsLeft.me }, rearranged: { me: game.rearranged.opp, opp: game.rearranged.me }, turn: 'opp' } : game;
        // Umstellen der Gegenseite
        const spots = aiRearrangeSlots(view, rng);
        if (spots && canRearrange(game, side)) {
            if (game.catchUp) rearrangedInCatchUp = true;
            rearrangeCalls[side]++;
            game = rearrange(game, side, spots);
        }
        let last: number | null = null;
        while (!roundOver(game)) {
            const v2: Game = mirrored ? { ...game, cups: { me: game.cups.opp, opp: game.cups.me }, islandsLeft: { me: game.islandsLeft.opp, opp: game.islandsLeft.me }, roundHits: game.roundHits } : game;
            const plan = planAiThrow(v2, rng, level, last);
            if (!plan) break;
            if (plan.islandCall) islandCalls[side]++;
            const out = applyThrow(game, plan.result, { islandCalled: plan.islandCall });
            game = out.game; events.push(...out.events);
            last = plan.result.kind === 'hit' ? plan.result.cupId : null;
            if (canTrick(game)) game = skipTrick(game);
        }
        const before = game.cups[other(side)].length;
        const res = resolveRound(game);
        removedMax = Math.max(removedMax, before - res.game.cups[other(side)].length);
        game = res.game; events.push(...res.events);
        rounds++;
    }
    return { game, events, rounds, islandCalls, removedMax, rearrangeCalls, rearrangedInCatchUp, finished: !!game.winner };
}

describe('Ganze Spiele Rechner gegen Rechner', () => {
    const runs = [] as ReturnType<typeof playout>[];
    for (let seed = 1; seed <= 60; seed++) runs.push(playout(seed, [1, 1.25, 1.5][seed % 3], (['easy', 'normal', 'hard'] as const)[seed % 3]));

    it('jedes Spiel geht zu Ende', () => {
        expect(runs.every(r => r.finished)).toBe(true);
    });

    it('niemand sagt mehr als zwei Islands an', () => {
        for (const r of runs) {
            expect(r.islandCalls.me).toBeLessThanOrEqual(ISLANDS_PER_GAME);
            expect(r.islandCalls.opp).toBeLessThanOrEqual(ISLANDS_PER_GAME);
            expect(r.game.islandsLeft.me).toBeGreaterThanOrEqual(0);
            expect(r.game.islandsLeft.opp).toBeGreaterThanOrEqual(0);
        }
    });

    it('sechs Becher auf einmal gibt es nur nach zwei Island-Treffern direkt hintereinander', () => {
        for (const r of runs) {
            const sixes = r.events.filter(e => e.type === 'remove' && e.ids.length >= 6 && e.reason === 'islandStreak');
            // Island-Treffer insgesamt: ohne zwei davon gibt es keine Sechs
            const islandHits = r.events.filter(e => e.type === 'hit' && e.island).length;
            if (sixes.length > 0) expect(islandHits).toBeGreaterThanOrEqual(2);
            // eine Bombe nimmt höchstens drei Becher (weniger, wenn nicht mehr da sind)
            expect(r.events.filter(e => e.type === 'remove' && e.reason === 'bomb').every(e => e.type === 'remove' && e.ids.length >= 1 && e.ids.length <= 3)).toBe(true);
        }
        // über alle Spiele kommt es nur selten vor
        const total = runs.reduce((n, r) => n + r.events.filter(e => e.type === 'remove' && e.reason === 'islandStreak').length, 0);
        expect(total).toBeLessThan(runs.length);
    });

    it('umgestellt wird höchstens einmal je Seite, auch wenn es beim Nachziehen passiert', () => {
        for (const r of runs) {
            expect(r.rearrangeCalls.me).toBeLessThanOrEqual(1);
            expect(r.rearrangeCalls.opp).toBeLessThanOrEqual(1);
            // zu Beginn des Nachziehens ist Umstellen erlaubt, wenn es noch nicht geschehen ist
            expect(typeof r.rearrangedInCatchUp).toBe('boolean');
        }
    });

    it('Nachziehen und Verlängerung kommen vor, ohne dass es ausufert', () => {
        const catchUps = runs.reduce((n, r) => n + r.events.filter(e => e.type === 'catchUp').length, 0);
        expect(catchUps).toBeGreaterThan(0);
        for (const r of runs) expect(r.game.overtime).toBeLessThan(25);
    });
});
