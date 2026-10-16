import { describe, it, expect } from 'vitest';
import { newGame, slotsOf } from './engine';
import { birdPoint, birdCupAt, birdSlotAt, birdZoom, BIRD_ZOOM_MS } from './birdseye';

describe('Umstellen von oben', () => {
    it('die zehn Plätze liegen als Dreieck mit genug Abstand, die Spitze unten zu mir', () => {
        const points = Array.from({ length: 10 }, (_, i) => birdPoint(i));
        for (let a = 0; a < 10; a++) for (let b = a + 1; b < 10; b++) {
            expect(Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y)).toBeGreaterThan(180);
        }
        expect(points[9].y).toBeGreaterThan(points[0].y);
        expect(Math.min(...points.map(p => p.x))).toBeGreaterThan(100);
        expect(Math.max(...points.map(p => p.x))).toBeLessThan(980);
    });

    it('trifft Becher und freie Plätze großzügig, belegte Plätze nicht', () => {
        const game = newGame('me');
        game.cups.opp = game.cups.opp.filter(c => [0, 1, 2, 3].includes(c.id));
        const slot9 = birdPoint(9);
        expect(birdCupAt(game, { x: birdPoint(2).x + 60, y: birdPoint(2).y - 50 })).toBe(2);
        expect(birdCupAt(game, slot9)).toBeNull();
        expect(birdSlotAt(game, { x: slot9.x + 70, y: slot9.y + 40 })).toBe(9);
        // auf einem Becher gibt es keinen freien Platz
        expect(birdSlotAt(game, birdPoint(0))).toBeNull();
        expect(slotsOf('opp').length).toBe(10);
    });

    it('zoomt heran und wieder heraus', () => {
        const view = { dragging: null, start: 0, closing: null as number | null, dragPoint: null };
        expect(birdZoom(view, 0)).toBe(0);
        expect(birdZoom(view, BIRD_ZOOM_MS)).toBe(1);
        view.closing = 1000;
        expect(birdZoom(view, 1000 + BIRD_ZOOM_MS)).toBe(0);
    });
});
