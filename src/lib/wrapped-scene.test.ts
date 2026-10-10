import { describe, it, expect } from 'vitest';
import { drawWrappedFrame, totalDuration, segmentStarts, type SceneModel, type SceneKey } from './wrapped-scene';

// Zeichenfläche, die jeden Aufruf annimmt und ungültige Maße wie ein Browser ablehnt
function fakeContext() {
    const gradient = { addColorStop: () => undefined };
    const target: Record<string, unknown> = {
        measureText: (text: string) => ({ width: text.length * 20 }),
        createLinearGradient: () => gradient,
        createRadialGradient: (_x0: number, _y0: number, r0: number, _x1: number, _y1: number, r1: number) => {
            if (r0 < 0 || r1 < 0) throw new Error('negativer Radius im Verlauf');
            return gradient;
        },
        ellipse: (_x: number, _y: number, rx: number, ry: number) => { if (rx < 0 || ry < 0) throw new Error(`negativer Ellipsenradius ${rx}/${ry}`); },
        arc: (_x: number, _y: number, r: number) => { if (r < 0) throw new Error(`negativer Kreisradius ${r}`); },
    };
    return new Proxy(target, {
        get: (obj, prop: string) => (prop in obj ? obj[prop] : () => undefined),
        set: (obj, prop: string, value) => { obj[prop] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
}

const keys: SceneKey[] = ['table', 'setup', 'throw', 'rally', 'win', 'final'];
const model: SceneModel = {
    title: 'Wrapped 2026', playerName: 'Nick', opponentName: 'Heber', primary: '#006b50',
    segments: keys.map(key => ({ key, eyebrow: 'Eyebrow', value: '42', countTo: 42, title: 'Titel der Folie', lines: ['Zeile eins', 'Zeile zwei'] })),
};

describe('drawWrappedFrame', () => {
    it('zeichnet zu jedem Zeitpunkt der Szene ohne Fehler', () => {
        const ctx = fakeContext();
        const total = totalDuration(model);
        // dicht abtasten: Einblendungen haben kurze Phasen mit sehr kleinen Größen
        for (let time = 0; time <= total; time += 16) {
            expect(() => drawWrappedFrame(ctx, model, time), `bei ${time} ms`).not.toThrow();
        }
    });

    it('kommt mit Zeiten außerhalb der Szene und ohne Gegner zurecht', () => {
        const ctx = fakeContext();
        expect(() => drawWrappedFrame(ctx, { ...model, opponentName: null }, -500)).not.toThrow();
        expect(() => drawWrappedFrame(ctx, { ...model, opponentName: null }, totalDuration(model) + 5000)).not.toThrow();
    });

    it('legt die Abschnitte lückenlos hintereinander', () => {
        const starts = segmentStarts(model);
        expect(starts[0]).toBe(0);
        expect(starts).toHaveLength(6);
        expect(totalDuration(model)).toBeGreaterThan(starts[5]);
    });
});
