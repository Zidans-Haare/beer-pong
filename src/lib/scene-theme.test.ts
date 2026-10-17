import { describe, it, expect } from 'vitest';
import { drawSceneBackdrop, cheerAt, isSceneTheme, SCENE_THEMES, DEFAULT_THEME } from './scene-theme';

// Zeichenfläche, die jeden Aufruf annimmt und ungültige Maße wie ein Browser ablehnt
function fakeContext() {
    const gradient = { addColorStop: (offset: number) => { if (offset < 0 || offset > 1) throw new Error(`Farbstopp ${offset}`); } };
    const target: Record<string, unknown> = {
        measureText: (text: string) => ({ width: text.length * 20 }),
        createLinearGradient: () => gradient,
        createRadialGradient: (_x0: number, _y0: number, r0: number, _x1: number, _y1: number, r1: number) => { if (r0 < 0 || r1 < 0) throw new Error('negativer Radius'); return gradient; },
        arc: (_x: number, _y: number, r: number) => { if (r < 0) throw new Error(`negativer Kreisradius ${r}`); },
        ellipse: (_x: number, _y: number, rx: number, ry: number) => { if (rx < 0 || ry < 0) throw new Error('negative Ellipse'); },
    };
    return new Proxy(target, {
        get: (obj, prop: string) => (prop in obj ? obj[prop] : () => undefined),
        set: (obj, prop: string, value) => { obj[prop] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
}

describe('Hintergründe der Szenen', () => {
    it('es gibt fünf, das Stadion ist Standard', () => {
        expect(SCENE_THEMES).toHaveLength(5);
        expect(DEFAULT_THEME).toBe('stadium');
        expect(isSceneTheme('beach')).toBe(true);
        expect(isSceneTheme('mond')).toBe(false);
        expect(isSceneTheme(null)).toBe(false);
    });

    for (const theme of SCENE_THEMES) {
        it(`${theme} zeichnet zu jedem Zeitpunkt und bei jedem Jubel ohne Fehler`, () => {
            const ctx = fakeContext();
            for (let time = 0; time < 20000; time += 777) {
                for (const cheer of [0, 0.4, 1]) expect(() => drawSceneBackdrop(ctx, theme, '#006b50', time, (time % 1000) / 1000, cheer)).not.toThrow();
            }
        });
    }

    it('Jubel springt auf und klingt ab', () => {
        expect(cheerAt(500, [1000])).toBe(0);
        expect(cheerAt(1000, [1000])).toBe(1);
        expect(cheerAt(1900, [1000], 1800)).toBeCloseTo(0.5, 5);
        expect(cheerAt(3000, [1000], 1800)).toBe(0);
        // mehrere Momente: der stärkste zählt
        expect(cheerAt(2100, [1000, 2000], 1800)).toBeGreaterThan(0.9);
    });
});
