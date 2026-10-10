import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { dateFilter, findSeasonForDate, resolveSeasonParam, accentCssVariables, accentCss, isHexColor, seasonRange, type SeasonInfo } from './seasons';

const season = (id: string, start: string, end: string | null, accentColor = '#006b50'): SeasonInfo =>
    ({ id, name: id, startDate: new Date(start), endDate: end ? new Date(end) : null, accentColor });

// neueste zuerst, wie getSeasons()
const s2 = season('s2', '2026-12-01T00:00:00Z', null, '#1d4ed8');
const s1 = season('s1', '2000-01-01T00:00:00Z', '2026-12-01T00:00:00Z');
const seasons = [s2, s1];

describe('Saison-Zuordnung', () => {
    it('ordnet ein Datum der passenden Saison zu', () => {
        expect(findSeasonForDate(seasons, new Date('2026-03-01T20:00:00Z'))?.id).toBe('s1');
        expect(findSeasonForDate(seasons, new Date('2027-01-05T20:00:00Z'))?.id).toBe('s2');
    });

    it('Enddatum ist exklusiv: genau zum Wechsel gehört das Turnier zur neuen Saison', () => {
        expect(findSeasonForDate(seasons, new Date('2026-12-01T00:00:00Z'))?.id).toBe('s2');
        expect(findSeasonForDate(seasons, new Date('2026-11-30T23:59:59Z'))?.id).toBe('s1');
    });
});

describe('Saison-Parameter', () => {
    it('ohne Angabe gilt die aktuelle Saison', () => {
        expect(resolveSeasonParam(undefined, seasons)).toEqual({ selected: s2, isAll: false });
    });
    it("'all' wählt alle Saisons", () => {
        expect(resolveSeasonParam('all', seasons)).toEqual({ selected: null, isAll: true });
    });
    it('wählt eine bestimmte Saison und ignoriert unbekannte IDs', () => {
        expect(resolveSeasonParam('s1', seasons).selected).toBe(s1);
        expect(resolveSeasonParam('gibt-es-nicht', seasons).selected).toBe(s2);
    });
});

describe('dateFilter', () => {
    it('ohne Saison und Zeitraum kein Filter', () => {
        expect(dateFilter(undefined)).toBeUndefined();
    });
    it('übernimmt Start und Ende der Saison', () => {
        const r = seasonRange(s1)!;
        expect(dateFilter(r)).toEqual({ gte: s1.startDate, lt: s1.endDate });
    });
    it('offene Saison hat kein lt', () => {
        expect(dateFilter(seasonRange(s2))).toEqual({ gte: s2.startDate });
    });
    it('nimmt bei Zeitraum + Saison den späteren Start', () => {
        const since = new Date('2027-02-01T00:00:00Z');
        expect(dateFilter(seasonRange(s2), since)).toEqual({ gte: since });
        const early = new Date('2025-01-01T00:00:00Z');
        expect(dateFilter(seasonRange(s2), early)).toEqual({ gte: s2.startDate });
    });
});

describe('Saisonfarbe', () => {
    it('erkennt gültige Hex-Farben', () => {
        expect(isHexColor('#1d4ed8')).toBe(true);
        expect(isHexColor('red')).toBe(false);
        expect(isHexColor('#12345')).toBe(false);
        expect(isHexColor('#12345g')).toBe(false);
    });

    it('liefert RGB-Variable passend zur Farbe', () => {
        const vars = accentCssVariables('#1d4ed8');
        expect(vars['--color-primary']).toBe('#1d4ed8');
        expect(vars['--color-primary-rgb']).toBe('29, 78, 216');
    });

    it('dunkelt helle Farben ab, damit weißer Text lesbar bleibt', () => {
        const vars = accentCssVariables('#ffff00');
        expect(vars['--color-primary']).not.toBe('#ffff00');
    });

    it('fällt bei ungültigen Werten auf das Standard-Grün zurück (kein CSS-Einschleusen)', () => {
        const css = accentCss('red;} body{display:none');
        expect(css).toContain('#006b50');
        expect(css).not.toContain('display:none');
    });
});
