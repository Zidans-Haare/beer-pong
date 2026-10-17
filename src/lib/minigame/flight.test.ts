import { describe, it, expect } from 'vitest';
import { arcAt, project, groundSpot, mouthSpot, rimSpot, offsetIn, apexFor, MY_HAND, OPP_HAND } from './flight';
import { cupMouth } from './aim';
import { slotsOf } from './engine';

describe('Flugbahn des Balls', () => {
    const cup = slotsOf('opp', 1)[9];

    it('startet an den Händen und endet in der Becheröffnung', () => {
        expect(project(MY_HAND)).toMatchObject({ x: expect.closeTo(690, 0), y: expect.closeTo(1650, 0) });
        expect(project(OPP_HAND)).toMatchObject({ x: expect.closeTo(570, 0), y: expect.closeTo(880, 0) });
        const m = cupMouth(cup);
        const end = project(mouthSpot(cup, 1));
        expect(end.x).toBeCloseTo(m.x, 0);
        expect(Math.abs(end.y - m.y)).toBeLessThan(4);
    });

    it('steigt erst und fällt am Ende von oben in den Becher', () => {
        const to = mouthSpot(cup, 1);
        const apex = apexFor(MY_HAND, to);
        const ys = Array.from({ length: 41 }, (_, i) => arcAt(MY_HAND, to, apex, i / 40).y);
        // höchster Punkt (kleinstes y) liegt deutlich über dem Ziel
        expect(Math.min(...ys)).toBeLessThan(ys[40] - 150);
        // die letzten Schritte gehen nach unten auf dem Bildschirm
        expect(ys[40]).toBeGreaterThan(ys[38]);
        // der Ball wird in der Ferne kleiner
        expect(arcAt(MY_HAND, to, apex, 1).r).toBeLessThan(arcAt(MY_HAND, to, apex, 0).r);
    });

    it('der Landepunkt bleibt in der Öffnung, der Randpunkt liegt am Rand in Richtung des Wurfs', () => {
        const m = cupMouth(cup);
        const inside = project(mouthSpot(cup, 1, offsetIn({ x: m.x + 500, y: m.y }, m)));
        expect(Math.abs(inside.x - m.x)).toBeLessThan(40 * m.scale * 0.6);
        const left = project(rimSpot(cup, 1, { x: -1, y: 0 }));
        expect(left.x).toBeLessThan(m.x - 40 * m.scale);
        const front = project(rimSpot(cup, 1, { x: 0, y: 1 }));
        expect(front.y).toBeGreaterThan(m.y);
    });

    it('Tischpunkte lassen sich hin und zurück rechnen, auch hinter dem Tisch', () => {
        for (const p of [{ x: 540, y: 1200 }, { x: 300, y: 1000 }, { x: 600, y: 900 }]) {
            const back = project(groundSpot(p));
            expect(back.x).toBeCloseTo(p.x, 0);
            expect(back.y).toBeCloseTo(p.y, 0);
        }
    });
});
