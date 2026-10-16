import { describe, it, expect } from 'vitest';
import { newGame, islandsOf, rearrange, slotIndexOf } from './engine';
import { planAiThrow, hitChance, aiSwat, aiRearrangeSlots, DIFFICULTIES, ROLL_BACK_CHANCE, type Rng } from './ai';
import { judgeDirect, judgeBounce, cupMouth, hitRadii } from './aim';

// Gleichmäßiger Zufall mit festem Anfang
function seeded(seed: number): Rng {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

describe('Gegner', () => {
    it('trifft, verfehlt und prallt am Rand ab, je nach Schwierigkeit unterschiedlich oft', () => {
        const rates: Record<string, number> = {};
        for (const difficulty of ['easy', 'normal', 'hard'] as const) {
            const rng = seeded(7);
            let hits = 0, rims = 0, misses = 0;
            const n = 4000;
            for (let i = 0; i < n; i++) {
                const plan = planAiThrow(newGame('opp'), rng, difficulty)!;
                if (plan.result.kind === 'hit') hits++; else if (plan.result.kind === 'rim') rims++; else misses++;
            }
            rates[difficulty] = hits / n;
            expect(rims).toBeGreaterThan(0);
            expect(misses).toBeGreaterThan(0);
            expect(hits / n).toBeGreaterThan(DIFFICULTIES[difficulty].hit * 0.6);
            expect(hits / n).toBeLessThan(DIFFICULTIES[difficulty].hit * 1.1);
        }
        expect(rates.easy).toBeLessThan(rates.normal);
        expect(rates.normal).toBeLessThan(rates.hard);
    });

    it('wird mit weniger Bechern ungenauer', () => {
        expect(hitChance('normal', 2)).toBeLessThan(hitChance('normal', 10));
        expect(hitChance('hard', 1)).toBeGreaterThanOrEqual(0.12);
    });

    it('sagt Island nur an, wenn der Becher wirklich allein steht', () => {
        const rng = seeded(3);
        const game = newGame('opp');
        game.cups.me = game.cups.me.filter(c => [0, 1, 2, 9].includes(c.id));
        game.cups.me.find(c => c.id === 9)!.u = -0.85;
        let calls = 0;
        for (let i = 0; i < 300; i++) {
            const plan = planAiThrow(game, rng, 'normal')!;
            if (plan.islandCall) { calls++; expect(islandsOf(game.cups.me).map(c => c.id)).toContain(plan.cupId); }
        }
        expect(calls).toBeGreaterThan(0);
    });

    it('wirft nicht ohne Ziel', () => {
        const game = newGame('opp');
        game.cups.me = [];
        expect(planAiThrow(game, seeded(1), 'normal')).toBeNull();
    });

    it('schlägt Aufpraller manchmal weg und wirft dabei manchmal eigene Becher um', () => {
        const rng = seeded(11);
        let swats = 0, accidents = 0;
        for (let i = 0; i < 2000; i++) {
            const r = aiSwat(newGame('me'), rng, 'hard');
            if (r.swat) swats++;
            if (r.ownCupLost !== null) accidents++;
        }
        expect(swats / 2000).toBeGreaterThan(0.35);
        expect(swats / 2000).toBeLessThan(0.55);
        expect(accidents).toBeGreaterThan(0);
        expect(accidents).toBeLessThan(swats);
    });

    it('stellt bei vier Bechern des Spielers immer in 1-1-2 um', () => {
        const game = newGame('opp');
        game.cups.me = game.cups.me.slice(0, 4);
        const rng = seeded(5);
        const seen = new Set<string>();
        for (let i = 0; i < 40; i++) {
            const slots = aiRearrangeSlots(game, rng);
            expect(slots).not.toBeNull();
            expect(slots).toHaveLength(4);
            seen.add(slots!.join());
            const r = rearrange(game, 'opp', slots!);
            // Spitze (9), Mitte der dritten Reihe (5) und die zwei mittleren der letzten Reihe (1, 2)
            expect(r.cups.me.map(c => slotIndexOf(r, 'me', c)).sort()).toEqual([1, 2, 5, 9]);
        }
        // beide Spiegelungen kommen vor
        expect([...seen].sort()).toEqual(['9,5,1,2', '9,5,2,1']);
        // mit mehr als vier Bechern und ein zweites Mal gibt es nichts; beim Nachziehen stellt er um, wenn er es noch nicht gemacht hat
        expect(aiRearrangeSlots(newGame('opp'), rng)).toBeNull();
        expect(aiRearrangeSlots({ ...game, rearranged: { me: false, opp: true } }, seeded(1))).toBeNull();
        expect(aiRearrangeSlots({ ...game, catchUp: true }, seeded(1))).toHaveLength(4);
    });

    it('der Ball rollt nach dem Rand nur selten so weit zurück, dass es einen Trickshot gibt', () => {
        const rng = seeded(31);
        let rims = 0, back = 0, throws = 0;
        for (let i = 0; i < 6000; i++) {
            const plan = planAiThrow(newGame('opp'), rng, 'normal')!;
            throws++;
            if (plan.result.kind === 'rim') { rims++; if (plan.result.rolledBack) back++; }
        }
        expect(back / rims).toBeCloseTo(ROLL_BACK_CHANCE, 1);
        expect(back / throws).toBeLessThan(0.08);
    });

    it('wirft im Duell keine Aufpraller', () => {
        const rng = seeded(9);
        let bounces = 0, withBounce = 0;
        for (let i = 0; i < 1500; i++) {
            if (planAiThrow(newGame('opp'), rng, 'normal', null, false)!.bounce) bounces++;
            if (planAiThrow(newGame('opp'), rng, 'normal', null, true)!.bounce) withBounce++;
        }
        expect(bounces).toBe(0);
        expect(withBounce).toBeGreaterThan(0);
    });

    it('die Stufen unterscheiden sich deutlich in der Trefferquote', () => {
        const rate = (level: 'easy' | 'normal' | 'hard') => {
            const rng = seeded(21);
            let hits = 0;
            for (let i = 0; i < 3000; i++) if (planAiThrow(newGame('opp'), rng, level)!.result.kind === 'hit') hits++;
            return hits / 3000;
        };
        const easy = rate('easy'), normal = rate('normal'), hard = rate('hard');
        expect(normal - easy).toBeGreaterThan(0.12);
        expect(hard - normal).toBeGreaterThan(0.12);
    });

    it('unmöglich ist noch einmal deutlich stärker als schwer', () => {
        const rng = seeded(21);
        let hits = 0, swats = 0;
        for (let i = 0; i < 3000; i++) if (planAiThrow(newGame('opp'), rng, 'impossible')!.result.kind === 'hit') hits++;
        for (let i = 0; i < 2000; i++) if (aiSwat(newGame('me'), rng, 'impossible').swat) swats++;
        expect(hits / 3000).toBeGreaterThan(0.7);
        expect(swats / 2000).toBeGreaterThan(0.75);
        expect(hitChance('impossible', 10)).toBeGreaterThan(hitChance('hard', 10) + 0.15);
        expect(hitChance('impossible', 10, 1.5)).toBeLessThanOrEqual(0.95);
        expect(DIFFICULTIES.impossible.sway).toBeGreaterThan(DIFFICULTIES.hard.sway);
    });

    it('größere Becher werden leichter getroffen', () => {
        expect(hitChance('normal', 10, 1.5)).toBeGreaterThan(hitChance('normal', 10, 1.25));
        expect(hitChance('normal', 10, 1.25)).toBeGreaterThan(hitChance('normal', 10, 1));
        expect(hitChance('hard', 10, 1.5)).toBeLessThanOrEqual(0.9);
    });
});

describe('Zielen', () => {
    const game = newGame('me');
    const cup = game.cups.opp.find(c => c.id === 9)!;

    it('trifft in der Mitte der Becheröffnung, schrammt am Rand und verfehlt daneben', () => {
        const mouth = cupMouth(cup);
        const { rx } = hitRadii(mouth.scale);
        expect(judgeDirect(game.cups.opp, { x: mouth.x, y: mouth.y })).toEqual({ kind: 'hit', cupId: 9, bounce: false });
        expect(judgeDirect(game.cups.opp, { x: mouth.x + rx * 1.3, y: mouth.y })).toMatchObject({ kind: 'rim', cupId: 9 });
        expect(judgeDirect(game.cups.opp, { x: mouth.x + 400, y: mouth.y })).toEqual({ kind: 'miss' });
    });

    it('der Aufpraller gilt nur auf dem Tisch vor dem Becher', () => {
        const base = cupMouth(cup);
        const front = { x: base.x, y: base.baseY + 118 * base.scale * 0.45 };
        expect(judgeBounce(game.cups.opp, front)).toMatchObject({ kind: 'hit', cupId: 9, bounce: true });
        // hinter dem Becher oder weit daneben: kein Aufpraller
        expect(judgeBounce(game.cups.opp, { x: base.x, y: base.baseY - 80 })).toEqual({ kind: 'miss' });
        expect(judgeBounce(game.cups.opp, { x: base.x + 300, y: front.y })).toEqual({ kind: 'miss' });
    });
});
