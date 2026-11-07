import { describe, it, expect } from 'vitest';
import { drawDrunkFrame, DRUNK_TOTAL_MS, type DrunkSceneModel } from './drunk-scene';

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

const model: DrunkSceneModel = { primary: '#006b50', pictureName: 'Josie', opponentName: 'Moonzy', missLabel: 'DANEBEN!', sorryLabel: 'Ups … sorry, Josie!', hiccupLabel: 'Hicks!' };

describe('drawDrunkFrame', () => {
    it('zeichnet zu jedem Zeitpunkt der Szene ohne Fehler', () => {
        const ctx = fakeContext();
        for (let time = 0; time <= DRUNK_TOTAL_MS; time += 16) {
            expect(() => drawDrunkFrame(ctx, model, time), `bei ${time} ms`).not.toThrow();
        }
    });

    it('kommt mit Zeiten außerhalb der Szene zurecht', () => {
        const ctx = fakeContext();
        expect(() => drawDrunkFrame(ctx, model, -200)).not.toThrow();
        expect(() => drawDrunkFrame(ctx, model, DRUNK_TOTAL_MS + 3000)).not.toThrow();
    });
});
