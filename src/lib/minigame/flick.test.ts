import { describe, it, expect } from 'vitest';
import { flickLanding, reachFor, tremor, type Sample } from './aim';

// Gerades Wischen nach oben: `speed` Bildpunkte pro Millisekunde über `ms`
const swipe = (speed: number, ms = 100, dx = 0): Sample[] =>
    Array.from({ length: 6 }, (_, i) => ({ x: 540 + (dx * i) / 5, y: 1700 - ((speed * ms) * i) / 5, t: (ms * i) / 5 }));

describe('Wurf per Wischen', () => {
    it('schnelleres Wischen fliegt weiter', () => {
        const slow = flickLanding(swipe(2.5));
        const fast = flickLanding(swipe(4.5));
        expect(slow.ok && fast.ok).toBe(true);
        if (slow.ok && fast.ok) {
            expect(fast.landing.y).toBeLessThan(slow.landing.y);
            expect(slow.landing.y).toBeCloseTo(1650 - reachFor(2.5), 0);
        }
    });

    it('ein gerades Wischen trifft die Mitte, zur Seite gewischt wandert der Ball mit', () => {
        const straight = flickLanding(swipe(3.5));
        const right = flickLanding(swipe(3.5, 100, 40));
        const left = flickLanding(swipe(3.5, 100, -40));
        if (!straight.ok || !right.ok || !left.ok) throw new Error('kein Wurf');
        expect(straight.landing.x).toBeCloseTo(540, 0);
        expect(right.landing.x).toBeGreaterThan(straight.landing.x + 20);
        expect(left.landing.x).toBeLessThan(straight.landing.x - 20);
    });

    it('die weiten Becher am Tischende erreicht man mit einem zügigen Wischen', () => {
        const fast = flickLanding(swipe(4.2));
        if (!fast.ok) throw new Error('kein Wurf');
        // Becher des Gegners stehen im Bild zwischen etwa 960 und 1200
        expect(fast.landing.y).toBeGreaterThan(900);
        expect(fast.landing.y).toBeLessThan(1250);
    });

    it('zählt nur das letzte Stück des Wischens', () => {
        // erst langsam, am Ende schnell
        const samples: Sample[] = [
            { x: 540, y: 1800, t: 0 }, { x: 540, y: 1780, t: 200 }, { x: 540, y: 1760, t: 400 },
            { x: 540, y: 1700, t: 440 }, { x: 540, y: 1640, t: 480 }, { x: 540, y: 1580, t: 520 },
        ];
        const result = flickLanding(samples);
        if (!result.ok) throw new Error('kein Wurf');
        expect(result.speed).toBeGreaterThan(1.3);
    });

    it('lehnt zu kurze und seitliche Wischer ab', () => {
        expect(flickLanding([])).toEqual({ ok: false, reason: 'short' });
        expect(flickLanding(swipe(0.1, 100))).toEqual({ ok: false, reason: 'short' });
        expect(flickLanding(swipe(2, 100, 700))).toEqual({ ok: false, reason: 'direction' });
        const down = swipe(2).map(p => ({ ...p, y: 3400 - p.y }));
        expect(flickLanding(down)).toEqual({ ok: false, reason: 'direction' });
    });

    it('das Handzittern ist klein und wächst mit der Stufe und bei Tricks', () => {
        let seed = 1;
        const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const spread = (amplitude: number, factor: number) => {
            let sum = 0;
            for (let i = 0; i < 2000; i++) { const t = tremor(amplitude, 1100, factor, rng); sum += t.x * t.x; }
            return Math.sqrt(sum / 2000);
        };
        expect(spread(24, 1)).toBeLessThan(spread(46, 1));
        expect(spread(34, 1)).toBeLessThan(spread(34, 2));
        expect(spread(34, 1)).toBeLessThan(15);
    });
});

import { slotAt, cupAt } from './aim';
import { newGame, slotsOf, moveCup } from './engine';
import { tablePoint } from '@/lib/wrapped-scene';

describe('Umstellen: Plätze antippen', () => {
    const center = (slot: { u: number; v: number }) => { const p = tablePoint(slot.u, slot.v); return { x: p.x, y: p.y - 55 * p.scale }; };

    it('ein freier Platz wird erkannt, ein belegter nicht', () => {
        const g = newGame('me');
        g.cups.opp = g.cups.opp.filter(c => [0, 1, 2, 3].includes(c.id));
        const slots = slotsOf('opp', 1);
        expect(slotAt(g, 'opp', center(slots[9]))).toBe(9);
        expect(slotAt(g, 'opp', center(slots[5]))).toBe(5);
        // auf einen Becher getippt: kein freier Platz daneben
        expect(slotAt(g, 'opp', center(slots[0]))).toBeNull();
        expect(cupAt(g, 'opp', center(slots[0]))?.id).toBe(0);
    });

    it('auch die weit entfernten Becher am Tischende lassen sich greifen, im Abstand von etwa zwei Fingerbreiten', () => {
        const g = newGame('me');
        const slots = slotsOf('opp', 1);
        for (const id of [0, 1, 2, 3]) {
            const c = center(slots[id]);
            expect(cupAt(g, 'opp', { x: c.x + 12, y: c.y + 14 })?.id).toBe(id);
        }
    });

    it('bei großen Bechern funktioniert es genauso', () => {
        const g = newGame('me', 1.5);
        const slots = slotsOf('opp', 1.5);
        const moved = moveCup(g, 'me', 0, 9);
        expect(moved).toBe(g);
        const small = { ...g, cups: { ...g.cups, opp: g.cups.opp.filter(c => c.id !== 9) } };
        const p = tablePoint(slots[9].u, slots[9].v);
        expect(slotAt(small, 'opp', { x: p.x, y: p.y - 55 * p.scale * 1.5 })).toBe(9);
    });
});
