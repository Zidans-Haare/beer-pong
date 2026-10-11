import { describe, it, expect } from 'vitest';
import {
    SKINS, HAIR_COLORS, SHIRTS, HAIR_STYLES, PATTERNS, ACCESSORIES, HEIGHTS, BUILDS, MOONZY_SKIN,
    defaultFigure, figureFor, lookFor, normalizeFigure, normalizeAccessories, toggleAccessory, randomFigure, isMoonzy, type FigureSpec,
} from './figure';
import { drawMe, drawOpponent, type Accessory, type FigureLook } from './wrapped-scene';
import { drawWalker } from './tournament-scene';
import { buildPodium, type FilmMatch, type Medal } from './tournament-film';

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

// Einzelne Teile, alle zusammen und typische Kombinationen
const ACCESSORY_SETS: Accessory[][] = [[], ...ACCESSORIES.map(a => [a]), ['beerhat', 'sunglasses', 'beard', 'earring', 'chain', 'scarf'], ['cap', 'glasses', 'scarf']];

const spec = (extra: Partial<FigureSpec> = {}): FigureSpec => ({ skin: 2, hairStyle: 'curly', hairColor: 3, shirt: 4, pattern: 'stripes', accessories: ['glasses'], height: 2, build: 0, ...extra });

describe('Figur-Daten', () => {
    it('nimmt gültige Einstellungen an, auch als JSON-Text', () => {
        expect(normalizeFigure(spec())).toEqual(spec());
        expect(normalizeFigure(JSON.stringify(spec()))).toEqual(spec());
    });

    it('weist Ungültiges ab', () => {
        for (const bad of [null, undefined, 5, 'kein json', '{}', [], spec({ skin: SKINS.length }), spec({ skin: -1 }), spec({ hairColor: 99 }), spec({ shirt: 1.5 }),
            { ...spec(), hairStyle: 'irokese' }, { ...spec(), pattern: 'karo' }, { ...spec(), accessories: ['hut'] }, { ...spec(), height: 3 }, { ...spec(), build: '1' }]) {
            expect(normalizeFigure(bad)).toBeNull();
        }
    });

    it('ohne eigene Einstellung sieht jeder gleich aus wie bisher und immer gleich', () => {
        const a = lookFor('Nick'), b = lookFor('  nick ');
        expect(a).toEqual(b);
        expect(a.skin).toBe(SKINS[0]);
        expect(a.hairStyle).toBe('short');
        expect(a.accessories).toEqual([]);
        expect(lookFor('Nick', 3).shirt).not.toBe(a.shirt);
    });

    it('die eigene Figur gewinnt und bestimmt Aussehen, Größe und Statur', () => {
        const look = lookFor('Nick', 0, { nick: spec() });
        expect(look).toMatchObject({ skin: SKINS[2], hair: HAIR_COLORS[3], shirt: SHIRTS[4], hairStyle: 'curly', pattern: 'stripes', accessories: ['glasses'], heightScale: HEIGHTS[2], widthScale: BUILDS[0] });
        // andere Spieler bleiben unberührt
        expect(lookFor('Heber', 0, { nick: spec() }).accessories).toEqual([]);
    });

    it('Moonzy bleibt dunkelhäutig, was auch eingestellt ist', () => {
        expect(isMoonzy(' Moonzy ')).toBe(true);
        expect(lookFor('Moonzy').skin).toBe(SKINS[MOONZY_SKIN]);
        expect(lookFor('Moonzy', 0, { moonzy: spec({ skin: 0 }) }).skin).toBe(SKINS[MOONZY_SKIN]);
        expect(figureFor('Moonzy', { moonzy: spec({ skin: 1 }) }).skin).toBe(MOONZY_SKIN);
        expect(randomFigure('Moonzy', () => 0.3).skin).toBe(MOONZY_SKIN);
        expect(defaultFigure('Moonzy').skin).toBe(MOONZY_SKIN);
        // alle anderen dürfen frei wählen
        expect(figureFor('Nick', { nick: spec({ skin: 5 }) }).skin).toBe(5);
    });

    it('der Zufall liefert immer gültige Figuren', () => {
        let seed = 7;
        const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 300; i++) expect(normalizeFigure(randomFigure('Nick', rng))).not.toBeNull();
    });

    it('das Podium im Turnierfilm zeigt die eigenen Figuren der Spieler', () => {
        const party = (id: string) => ({ ids: [id], names: [id], label: id });
        const matches: FilmMatch[] = [{ stage: 'BRACKET', round: 1, completedAt: null, durationSeconds: null, score1: 10, score2: 4, side1: party('Nick'), side2: party('Heber'), winner: 1 }];
        const podium = new Map<string, Medal>([['Nick', 'gold'], ['Heber', 'silver']]);
        const steps = buildPodium({ matches, podium, playerNames: new Map(), figures: { nick: spec({ accessories: ['cap', 'scarf'] }) } });
        expect(steps[0].looks[0].accessories).toEqual(['cap', 'scarf']);
        expect(steps[1].looks[0].accessories).toEqual([]);
    });
});

describe('Zubehör kombinieren', () => {
    it('nimmt mehrere Teile an und bringt sie in feste Reihenfolge', () => {
        expect(normalizeAccessories(['scarf', 'beard', 'glasses', 'cap'])).toEqual(['cap', 'glasses', 'beard', 'scarf']);
        expect(normalizeAccessories([])).toEqual([]);
        expect(normalizeAccessories(['beard', 'beard'])).toEqual(['beard']);
    });

    it('lässt höchstens eine Kopfbedeckung und eine Brille zu', () => {
        expect(normalizeAccessories(['cap', 'beerhat', 'beanie'])).toEqual(['cap']);
        expect(normalizeAccessories(['glasses', 'sunglasses'])).toEqual(['glasses']);
    });

    it('lehnt Unbekanntes ab', () => {
        expect(normalizeAccessories(['cap', 'zylinder'])).toBeNull();
        expect(normalizeFigure({ ...spec(), accessories: ['hut'] })).toBeNull();
        expect(normalizeFigure({ ...spec(), accessories: Array(20).fill('cap') })).toBeNull();
    });

    it('schaltet um: Kopfbedeckung und Brille ersetzen sich, Extras kommen dazu', () => {
        let list: Accessory[] = [];
        list = toggleAccessory(list, 'cap');
        list = toggleAccessory(list, 'beard');
        list = toggleAccessory(list, 'beerhat');
        expect(list).toEqual(['beerhat', 'beard']);
        list = toggleAccessory(list, 'sunglasses');
        list = toggleAccessory(list, 'glasses');
        expect(list).toEqual(['beerhat', 'glasses', 'beard']);
        list = toggleAccessory(list, 'beerhat');
        expect(list).toEqual(['glasses', 'beard']);
        list = toggleAccessory(list, 'scarf');
        expect(list).toEqual(['glasses', 'beard', 'scarf']);
    });

    it('ältere Figuren mit einem einzelnen Zubehör werden übernommen', () => {
        const legacy = { skin: 1, hairStyle: 'short', hairColor: 1, shirt: 1, pattern: 'plain', accessory: 'cap', height: 1, build: 1 };
        expect(normalizeFigure(legacy)?.accessories).toEqual(['cap']);
        expect(normalizeFigure({ ...legacy, accessory: 'none' })?.accessories).toEqual([]);
    });

    it('der Zufall hält die Gruppenregeln ein', () => {
        let seed = 3;
        const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 300; i++) {
            const list = randomFigure('Nick', rng).accessories;
            expect(list.filter(a => ['cap', 'beanie', 'beerhat', 'headband'].includes(a)).length).toBeLessThanOrEqual(1);
            expect(list.filter(a => ['glasses', 'sunglasses'].includes(a)).length).toBeLessThanOrEqual(1);
        }
    });
});

describe('Zeichnen aller Figuren', () => {
    // Alle Frisuren und Zubehörteile in jeder Größe und Statur, mit allen Mustern: keine ungültigen Maße
    it('zeichnet jede Kombination in allen drei Ansichten ohne Fehler', () => {
        const ctx = fakeContext();
        let count = 0;
        for (const hairStyle of HAIR_STYLES) for (const accessories of ACCESSORY_SETS) for (const pattern of PATTERNS) for (const height of [0, 1, 2] as const) for (const build of [0, 1, 2] as const) {
            const look: FigureLook = lookFor('Nick', 0, { nick: spec({ hairStyle, accessories, pattern, height, build, skin: (count++) % SKINS.length }) });
            expect(() => drawWalker(ctx, 540, 1200, 1, look, { walk: 0.5, cheer: 0.7, medal: 1, place: 1, crown: 1, time: 1234 })).not.toThrow();
            expect(() => drawMe(ctx, 1, 0.4, 0.5, 777, '#006b50', look)).not.toThrow();
            expect(() => drawOpponent(ctx, 1, -0.3, 'Gegner', 500, 0.2, look.skin, 0.4, look)).not.toThrow();
        }
        expect(count).toBe(HAIR_STYLES.length * ACCESSORY_SETS.length * PATTERNS.length * 9);
    });

    it('auch in Unterhose und mit allen Hauttönen', () => {
        const ctx = fakeContext();
        for (let skin = 0; skin < SKINS.length; skin++) {
            const look = { ...lookFor('Nick', 0, { nick: spec({ skin }) }), undies: true };
            expect(() => drawWalker(ctx, 540, 1200, 1, look, { walk: 1, cheer: 0, medal: 0, place: 3, crown: 0, time: 10 })).not.toThrow();
            expect(() => drawMe(ctx, 1, 0, 0, 0, '#006b50', look)).not.toThrow();
        }
    });
});
