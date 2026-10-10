import { prisma } from '@/lib/prisma';

// Zeitraum einer Saison; `end` ist exklusiv. Ohne Werte = unbegrenzt.
export interface SeasonRange {
    start?: Date;
    end?: Date;
}

export interface SeasonInfo {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date | null;
    accentColor: string;
}

export const DEFAULT_ACCENT = '#006b50';

export function seasonRange(season: Pick<SeasonInfo, 'startDate' | 'endDate'> | null | undefined): SeasonRange | undefined {
    if (!season) return undefined;
    return { start: season.startDate, end: season.endDate ?? undefined };
}

// Prisma-Filter für Turnier.date
export function dateFilter(range?: SeasonRange, since?: Date) {
    const gte = since && range?.start ? (since > range.start ? since : range.start) : (since ?? range?.start);
    const lt = range?.end;
    if (!gte && !lt) return undefined;
    return { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) };
}

// Neueste zuerst
export async function getSeasons(): Promise<SeasonInfo[]> {
    return prisma.season.findMany({ orderBy: { startDate: 'desc' } });
}

export async function getCurrentSeason(): Promise<SeasonInfo | null> {
    return prisma.season.findFirst({ where: { endDate: null }, orderBy: { startDate: 'desc' } });
}

export function findSeasonForDate(seasons: SeasonInfo[], date: Date): SeasonInfo | null {
    return seasons.find(s => s.startDate <= date && (!s.endDate || date < s.endDate)) ?? null;
}

// ?season=<id> | all; ohne Angabe gilt die aktuelle Saison
export function resolveSeasonParam(param: string | undefined, seasons: SeasonInfo[]): { selected: SeasonInfo | null; isAll: boolean } {
    if (param === 'all') return { selected: null, isAll: true };
    const byId = param ? seasons.find(s => s.id === param) : undefined;
    if (byId) return { selected: byId, isAll: false };
    const current = seasons.find(s => !s.endDate) ?? seasons[0] ?? null;
    return { selected: current, isAll: false };
}

// ---- Farben ----

export function isHexColor(value: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function toHex(rgb: number[]): string {
    return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

// Mischt `hex` mit Weiß (ratio 0..1 = Anteil Weiß)
function mixWithWhite(hex: string, ratio: number): string {
    return toHex(hexToRgb(hex).map(v => v + (255 - v) * ratio));
}

function luminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex).map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Dunkelt `hex` ab, bis weißer Text darauf mindestens Kontrast 4.5:1 hat (WCAG AA)
function ensureContrastWithWhite(hex: string): string {
    let color = hex;
    for (let i = 0; i < 20 && 1.05 / (luminance(color) + 0.05) < 4.5; i++) {
        color = toHex(hexToRgb(color).map(v => v * 0.92));
    }
    return color;
}

// CSS-Variablen für :root aus der Saisonfarbe
export function accentCssVariables(accent: string): Record<string, string> {
    const base = isHexColor(accent) ? accent : DEFAULT_ACCENT;
    const primary = ensureContrastWithWhite(base);
    return {
        '--color-primary': primary,
        '--color-primary-rgb': hexToRgb(primary).join(', '),
        '--color-primary-light': mixWithWhite(primary, 0.9),
    };
}

export function accentCss(accent: string): string {
    const vars = accentCssVariables(accent);
    // :root:root hat höhere Spezifität als das :root aus globals.css, egal in welcher Reihenfolge die Styles geladen werden
    return `:root:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
}
