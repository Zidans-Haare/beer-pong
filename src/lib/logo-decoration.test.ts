import { describe, it, expect } from 'vitest';
import { activeDecoration, easterSunday, oktoberfest, decorationCalendar, isDecorationMode } from './logo-decoration';

// Mittag in Berlin an einem Tag
const at = (iso: string) => new Date(`${iso}T11:00:00Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

describe('Logo-Deko nach Datum', () => {
    it('berechnet Ostern und die Wiesn richtig', () => {
        expect(ymd(easterSunday(2026))).toBe('2026-04-05');
        expect(ymd(easterSunday(2027))).toBe('2027-03-28');
        expect(ymd(easterSunday(2028))).toBe('2028-04-16');
        expect(oktoberfest(2026)).toEqual({ start: new Date('2026-09-19T00:00:00Z'), end: new Date('2026-10-04T00:00:00Z') });
        // erster Oktobersonntag vor dem 3.: die Wiesn geht bis zum Tag der Deutschen Einheit
        expect(ymd(oktoberfest(2027).end)).toBe('2027-10-03');
    });

    it('zeigt den passenden Anlass', () => {
        expect(activeDecoration(at('2026-12-01'), 'auto')).toBe('christmas');
        expect(activeDecoration(at('2026-12-24'), 'auto')).toBe('christmas');
        expect(activeDecoration(at('2026-12-31'), 'auto')).toBe('newyear');
        expect(activeDecoration(at('2027-01-06'), 'auto')).toBe('newyear');
        expect(activeDecoration(at('2027-01-07'), 'auto')).toBeNull();
        expect(activeDecoration(at('2027-03-15'), 'auto')).toBe('easter');
        expect(activeDecoration(at('2027-03-29'), 'auto')).toBe('easter');
        expect(activeDecoration(at('2027-03-30'), 'auto')).toBeNull();
        expect(activeDecoration(at('2026-09-25'), 'auto')).toBe('oktoberfest');
        expect(activeDecoration(at('2026-10-31'), 'auto')).toBe('halloween');
        expect(activeDecoration(at('2026-11-15'), 'auto')).toBeNull();
    });

    it('zählt in deutscher Zeit: 23:30 UTC am 30. November ist schon der 1. Dezember', () => {
        expect(activeDecoration(new Date('2026-11-30T23:30:00Z'), 'auto')).toBe('christmas');
    });

    it('der Admin kann sie ausschalten oder einen Anlass festlegen', () => {
        expect(activeDecoration(at('2026-12-24'), 'off')).toBeNull();
        expect(activeDecoration(at('2026-07-01'), 'easter')).toBe('easter');
        expect(isDecorationMode('auto')).toBe(true);
        expect(isDecorationMode('fasching')).toBe(false);
        expect(decorationCalendar(2026).map(e => e.decoration)).toContain('halloween');
    });
});
