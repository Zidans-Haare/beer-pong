import { describe, it, expect } from 'vitest';
import { drawTournamentFrame, filmTimeline, type FilmModel, type FilmSide } from './tournament-scene';

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

const look = { shirt: '#e4572e', hair: '#3b2a1a', style: 1 as const };
const solo = (name: string): FilmSide => ({ label: name, names: [name], looks: [look] });
const duo = (a: string, b: string): FilmSide => ({ label: `${a} & ${b}`, names: [a, b], looks: [look, { ...look, style: 2 }] });

const base: FilmModel = {
    title: '9. Eaststreet Turnier', primary: '#006b50', eyebrow: 'Finale', subtitle: '10. Oktober 2026 · 8 Spieler · 20 Spiele', brand: 'Bier Pong Turnierfilm',
    final: { winner: solo('Nick'), loser: solo('Moonzy'), winnerScore: 10, loserScore: 7, stamp: 'NICK GEWINNT!', line: 'Nick schlägt Moonzy im Finale' },
    podiumTitle: 'Siegerehrung',
    podium: [{ ...solo('Nick'), place: 1 }, { ...solo('Moonzy'), place: 2 }, { ...solo('Heber'), place: 3 }],
    facts: { eyebrow: 'Turniersieg', value: 'Nick', title: 'Turnier', lines: ['eins', 'zwei', 'drei'] },
    outro: { title: 'Bier Pong App', line: 'Made by Nick' },
    descriptions: {},
};

const variants: Record<string, FilmModel> = {
    'Einzel mit Ergebnis': base,
    'Team': { ...base, final: { ...base.final!, winner: duo('Nick', 'Heber'), loser: duo('Moonzy', 'Josie') }, podium: [{ ...duo('Nick', 'Heber'), place: 1 }, { ...duo('Moonzy', 'Josie'), place: 2 }] },
    'knappes Spiel mit Verlängerung': { ...base, final: { ...base.final!, winnerScore: 12, loserScore: 11 } },
    'zu null': { ...base, final: { ...base.final!, winnerScore: 1, loserScore: 0 } },
    'Finale ohne Ergebnis': { ...base, final: { ...base.final!, winnerScore: 0, loserScore: 0 } },
    'ohne Finale': { ...base, final: null },
    'ohne Podium': { ...base, podium: [] },
    'nur Sieger': { ...base, final: null, podium: [{ ...solo('Nick'), place: 1 }] },
};

describe('drawTournamentFrame', () => {
    for (const [name, model] of Object.entries(variants)) {
        it(`zeichnet zu jedem Zeitpunkt ohne Fehler: ${name}`, () => {
            const ctx = fakeContext();
            const { total } = filmTimeline(model);
            // dicht abtasten: Einblendungen haben kurze Phasen mit sehr kleinen Größen
            for (let time = 0; time <= total; time += 16) {
                expect(() => drawTournamentFrame(ctx, model, time), `bei ${time} ms`).not.toThrow();
            }
            expect(() => drawTournamentFrame(ctx, model, -500)).not.toThrow();
            expect(() => drawTournamentFrame(ctx, model, total + 5000)).not.toThrow();
        });
    }
});

describe('filmTimeline', () => {
    it('legt die Abschnitte lückenlos hintereinander', () => {
        const tl = filmTimeline(base);
        expect(tl.keys).toEqual(['intro', 'final', 'win', 'podium', 'facts', 'outro']);
        expect(tl.starts[0]).toBe(0);
        tl.starts.forEach((start, i) => { if (i > 0) expect(start).toBe(tl.starts[i - 1] + tl.durations[i - 1]); });
        expect(tl.total).toBe(tl.starts[5] + tl.durations[5]);
    });

    it('spielt das echte Ergebnis nach und lässt den Sieger zuletzt treffen', () => {
        const tl = filmTimeline(base);
        expect(tl.throws.filter(t => t.by === 'winner')).toHaveLength(10);
        expect(tl.throws.filter(t => t.by === 'loser')).toHaveLength(7);
        const last = tl.throws[tl.throws.length - 1];
        expect(last.by).toBe('winner');
        expect(last.last).toBe(true);
        expect(tl.throws.map(t => t.start)).toEqual([...tl.throws.map(t => t.start)].sort((a, b) => a - b));
        // der entscheidende Treffer ist der Beginn des Siegs
        expect(last.start + last.flight).toBe(tl.win);
        // kein Becher wird zweimal getroffen
        for (const by of ['winner', 'loser'] as const) {
            const targets = tl.throws.filter(t => t.by === by).map(t => t.target);
            expect(new Set(targets).size).toBe(targets.length);
        }
    });

    it('zeigt höchstens zehn Becher je Seite, auch bei Verlängerung', () => {
        const tl = filmTimeline(variants['knappes Spiel mit Verlängerung']);
        expect(tl.throws.filter(t => t.by === 'winner')).toHaveLength(10);
        expect(tl.throws.filter(t => t.by === 'loser')).toHaveLength(10);
        expect(tl.throws[tl.throws.length - 1].by).toBe('winner');
    });

    it('lässt Abschnitte weg, für die es keine Daten gibt', () => {
        expect(filmTimeline(variants['Finale ohne Ergebnis']).keys).toEqual(['intro', 'win', 'podium', 'facts', 'outro']);
        expect(filmTimeline(variants['ohne Finale']).keys).toEqual(['intro', 'podium', 'facts', 'outro']);
        expect(filmTimeline(variants['ohne Podium']).keys).toEqual(['intro', 'final', 'win', 'facts', 'outro']);
    });

    it('lässt die Plätze in der Reihenfolge 3, 2, 1 aufs Podium', () => {
        const tl = filmTimeline(base);
        expect(tl.landings.map(l => l.place)).toEqual([3, 2, 1]);
        expect(tl.landings.map(l => l.at)).toEqual([...tl.landings.map(l => l.at)].sort((a, b) => a - b));
        expect(tl.crown).toBeGreaterThan(tl.landings[2].at);
        expect(tl.landings[2].at).toBeLessThan(tl.facts);
    });
});
