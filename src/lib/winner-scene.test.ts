import { describe, it, expect } from 'vitest';
import { drawWinnerFrame, winnerTimeline, walkerPose, PODIUM, WINNER_TOTAL_MS } from './winner-scene';
import type { FilmSide } from './tournament-scene';

// Zeichenfläche, die jeden Aufruf annimmt und ungültige Maße wie ein Browser ablehnt
function fakeContext() {
    const gradient = { addColorStop: () => undefined };
    const target: Record<string, unknown> = {
        measureText: (text: string) => ({ width: text.length * 20 }),
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        ellipse: (_x: number, _y: number, rx: number, ry: number) => { if (rx < 0 || ry < 0) throw new Error(`negativer Ellipsenradius ${rx}/${ry}`); },
        arc: (_x: number, _y: number, r: number) => { if (r < 0) throw new Error(`negativer Kreisradius ${r}`); },
    };
    return new Proxy(target, {
        get: (obj, prop: string) => (prop in obj ? obj[prop] : () => undefined),
        set: (obj, prop: string, value) => { obj[prop] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
}

const look = { shirt: '#e4572e', hair: '#3b2a1a', style: 0 as const };
const solo = (name: string): FilmSide => ({ label: name, names: [name], looks: [look] });
const duo = (a: string, b: string): FilmSide => ({ label: `${a} & ${b}`, names: [a, b], looks: [look, look] });

const variants = {
    'drei Einzelspieler': [{ ...solo('Nick'), place: 1 as const }, { ...solo('Moonzy'), place: 2 as const }, { ...solo('Heber'), place: 3 as const }],
    'Teams': [{ ...duo('Nick', 'Heber'), place: 1 as const }, { ...duo('Moonzy', 'Josie'), place: 2 as const }, { ...duo('Flori', 'Tommek'), place: 3 as const }],
    'nur zwei Plätze': [{ ...solo('Nick'), place: 1 as const }, { ...solo('Moonzy'), place: 2 as const }],
    'nur der Sieger': [{ ...solo('Nick'), place: 1 as const }],
};

describe('drawWinnerFrame', () => {
    for (const [name, podium] of Object.entries(variants)) {
        it(`zeichnet zu jedem Zeitpunkt ohne Fehler: ${name}`, () => {
            const ctx = fakeContext();
            for (let time = 0; time <= WINNER_TOTAL_MS; time += 16) {
                expect(() => drawWinnerFrame(ctx, { podium }, time), `bei ${time} ms`).not.toThrow();
            }
            expect(() => drawWinnerFrame(ctx, { podium }, -300)).not.toThrow();
            expect(() => drawWinnerFrame(ctx, { podium }, WINNER_TOTAL_MS + 3000)).not.toThrow();
        });
    }

    it('lässt erst Platz 3, dann 2, zuletzt den Sieger ankommen und aufs Podest springen', () => {
        const tl = winnerTimeline({ podium: variants['drei Einzelspieler'] });
        expect(tl.arrivals.map(a => a.place)).toEqual([3, 2, 1]);
        expect(tl.jumps.map(j => j.place)).toEqual([3, 2, 1]);
        // erst vorn ankommen, dann nach hinten aufs Podest
        expect(tl.jumps[0].at).toBeGreaterThan(tl.arrivals[2].at + 1500);
        expect(tl.crown).toBeGreaterThan(tl.jumps[2].at);
        expect(tl.crown + 2000).toBeLessThan(WINNER_TOTAL_MS);
    });

    it('vorn sind die Figuren groß, am Ende stehen sie ruhig oben auf ihrem Block', () => {
        const tl = winnerTimeline({ podium: variants['drei Einzelspieler'] });
        for (const place of [1, 2, 3] as const) {
            const front = walkerPose(place, 0, 1, 0, 1500, tl);
            const end = walkerPose(place, 0, 1, 0, WINNER_TOTAL_MS, tl);
            expect(front.onPodium).toBe(false);
            expect(front.s).toBeGreaterThan(end.s);
            expect(front.y).toBeGreaterThan(end.y);
            expect(end).toMatchObject({ onPodium: true, x: PODIUM[place].x, y: PODIUM[place].top, cheer: 0, walk: 0 });
        }
        // der Sieger steht am höchsten
        expect(PODIUM[1].top).toBeLessThan(PODIUM[2].top);
        expect(PODIUM[2].top).toBeLessThan(PODIUM[3].top);
    });
});
