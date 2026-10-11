import { DARK_SKIN, type Accessory, type FigureLook, type HairStyle, type ShirtPattern } from '@/lib/wrapped-scene';

// Die Figur eines Spielers, wie sie in Siegerehrung, Turnierfilm, Wrapped, Duellen und Minispiel erscheint.
// Gespeichert werden nur Auswahlwerte (Paletten-Nummern, Stufen), nie Farben oder freie Zahlen.

export const SKINS = ['#fbe3c0', '#f5d0a9', '#e8b988', '#d49a6a', '#b87a4b', '#8d5a34', DARK_SKIN, '#4b2c1a'] as const;
export const HAIR_COLORS = ['#1f1a17', '#3b2a1a', '#7a4a21', '#a3401f', '#c9a15a', '#ead3a2', '#b8bcc2', '#5b6cff'] as const;
export const SHIRTS = ['#e4572e', '#3a86ff', '#8338ec', '#ff9f1c', '#2ec4b6', '#ef476f', '#f4d35e', '#5c7cfa', '#fb8500', '#d0d4dc', '#2f9e44', '#1d232b'] as const;
export const HAIR_STYLES: HairStyle[] = ['short', 'buzz', 'long', 'bun', 'curly', 'bald'];
export const PATTERNS: ShirtPattern[] = ['plain', 'stripes', 'dots'];
// Zubehör in drei Gruppen: eine Kopfbedeckung, eine Brille und beliebig viele Extras
export const HEADWEAR: Accessory[] = ['cap', 'beanie', 'beerhat', 'headband'];
export const EYEWEAR: Accessory[] = ['glasses', 'sunglasses'];
export const EXTRAS: Accessory[] = ['beard', 'earring', 'chain', 'scarf'];
export const ACCESSORIES: Accessory[] = [...HEADWEAR, ...EYEWEAR, ...EXTRAS];
// Größe und Statur in drei Stufen; die Abweichung bleibt klein, damit Tisch und Becher passen
export const HEIGHTS = [0.92, 1, 1.08] as const;
export const BUILDS = [0.88, 1, 1.14] as const;

export interface FigureSpec {
    skin: number;
    hairStyle: HairStyle;
    hairColor: number;
    shirt: number;
    pattern: ShirtPattern;
    // mehrere möglich: höchstens eine Kopfbedeckung und eine Brille, dazu beliebige Extras
    accessories: Accessory[];
    height: 0 | 1 | 2;
    build: 0 | 1 | 2;
}

// Figuren nach Namen (klein geschrieben, ohne Leerzeichen am Rand)
export type FigureMap = Record<string, FigureSpec>;
export const nameKey = (name: string) => name.trim().toLowerCase();

// Moonzy wird in jeder Szene dunkelhäutig gezeichnet; seine Hautfarbe lässt sich nicht ändern
export const MOONZY_SKIN = SKINS.indexOf(DARK_SKIN);
export const isMoonzy = (name: string) => nameKey(name) === 'moonzy';

function hash(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

// Aussehen ohne eigene Einstellung: Farben aus dem Namen, damit derselbe Spieler immer gleich aussieht
export function defaultFigure(name: string): FigureSpec {
    const h = hash(nameKey(name));
    return {
        skin: isMoonzy(name) ? MOONZY_SKIN : 0,
        hairStyle: 'short',
        // dunkle Haut, dunkles Haar
        hairColor: isMoonzy(name) ? 0 : 1 + ((h >>> 8) % 4),
        shirt: h % 10,
        pattern: 'plain', accessories: [], height: 1, build: 1,
    };
}

// Bringt eine Zubehörliste in Form: nur bekannte Werte, jeder höchstens einmal, in fester Reihenfolge, höchstens eine
// Kopfbedeckung und eine Brille. Unbekannte Werte machen die ganze Liste ungültig (null).
export function normalizeAccessories(raw: unknown[]): Accessory[] | null {
    if (raw.length > ACCESSORIES.length) return null;
    const picked = new Set<Accessory>();
    for (const item of raw) {
        if (!ACCESSORIES.includes(item as Accessory)) return null;
        picked.add(item as Accessory);
    }
    const list = ACCESSORIES.filter(a => picked.has(a));
    // nur die erste Kopfbedeckung und die erste Brille bleiben
    let hat = false, glasses = false;
    return list.filter(a => {
        if (HEADWEAR.includes(a)) { if (hat) return false; hat = true; }
        if (EYEWEAR.includes(a)) { if (glasses) return false; glasses = true; }
        return true;
    });
}

// Schaltet ein Zubehör um und hält die Gruppen ein: Eine neue Kopfbedeckung oder Brille ersetzt die alte
export function toggleAccessory(current: Accessory[], item: Accessory): Accessory[] {
    if (current.includes(item)) return current.filter(a => a !== item);
    const group = HEADWEAR.includes(item) ? HEADWEAR : EYEWEAR.includes(item) ? EYEWEAR : null;
    return normalizeAccessories([...(group ? current.filter(a => !group.includes(a)) : current), item]) ?? current;
}

const within = (value: unknown, max: number): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;

// Prüft Werte aus der Datenbank oder vom Browser. Ungültiges ergibt null.
export function normalizeFigure(raw: unknown): FigureSpec | null {
    let value = raw;
    if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return null; } }
    if (!value || typeof value !== 'object') return null;
    const v = value as Record<string, unknown>;
    if (!within(v.skin, SKINS.length - 1) || !within(v.hairColor, HAIR_COLORS.length - 1) || !within(v.shirt, SHIRTS.length - 1)
        || !within(v.height, 2) || !within(v.build, 2)) return null;
    if (!HAIR_STYLES.includes(v.hairStyle as HairStyle) || !PATTERNS.includes(v.pattern as ShirtPattern)) return null;
    // ältere Einstellungen hatten genau ein Zubehör (oder 'none')
    const rawAccessories = Array.isArray(v.accessories) ? v.accessories : typeof v.accessory === 'string' && v.accessory !== 'none' ? [v.accessory] : [];
    const accessories = normalizeAccessories(rawAccessories);
    if (!accessories) return null;
    return { skin: v.skin, hairStyle: v.hairStyle as HairStyle, hairColor: v.hairColor, shirt: v.shirt, pattern: v.pattern as ShirtPattern, accessories, height: v.height as 0 | 1 | 2, build: v.build as 0 | 1 | 2 };
}

// Einstellung für einen Namen: die eigene, sonst die aus dem Namen; bei Moonzy ist die Hautfarbe fest
export function figureFor(name: string, figures?: FigureMap | null): FigureSpec {
    const own = figures?.[nameKey(name)];
    const spec = own ?? defaultFigure(name);
    return isMoonzy(name) ? { ...spec, skin: MOONZY_SKIN } : spec;
}

const LEGACY: Record<HairStyle, 0 | 1 | 2> = { short: 0, buzz: 0, curly: 0, bald: 0, long: 1, bun: 2 };

// Für das Zeichnen. `shift` verschiebt die Hemdfarbe, damit zwei gleich aussehende Figuren am Tisch auseinanderzuhalten sind.
export function lookFor(name: string, shift = 0, figures?: FigureMap | null): FigureLook {
    const spec = figureFor(name, figures);
    return {
        shirt: SHIRTS[(spec.shirt + shift) % SHIRTS.length],
        hair: HAIR_COLORS[spec.hairColor],
        style: LEGACY[spec.hairStyle],
        skin: SKINS[spec.skin],
        hairStyle: spec.hairStyle, pattern: spec.pattern, accessories: spec.accessories,
        heightScale: HEIGHTS[spec.height], widthScale: BUILDS[spec.build],
    };
}

// Mit etwas Glück ein paar Teile: jedes Zubehör mit 25 Prozent, mit den Gruppenregeln
function randomAccessories(rng: () => number): Accessory[] {
    let list: Accessory[] = [];
    for (const item of ACCESSORIES) if (rng() < 0.25) list = toggleAccessory(list, item);
    return list;
}

// Zufällige Figur für den Würfel-Knopf im Editor
export function randomFigure(name: string, rng: () => number = Math.random): FigureSpec {
    const pick = <T,>(items: readonly T[]) => items[Math.floor(rng() * items.length)];
    return {
        skin: isMoonzy(name) ? MOONZY_SKIN : Math.floor(rng() * SKINS.length),
        hairStyle: pick(HAIR_STYLES), hairColor: Math.floor(rng() * HAIR_COLORS.length), shirt: Math.floor(rng() * SHIRTS.length),
        pattern: pick(PATTERNS), accessories: randomAccessories(rng), height: Math.floor(rng() * 3) as 0 | 1 | 2, build: Math.floor(rng() * 3) as 0 | 1 | 2,
    };
}
