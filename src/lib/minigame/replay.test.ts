import { describe, it, expect } from 'vitest';
import { parseReplay, roundsOf, hitsOf, throwsOfRound, type ReplayThrow } from './replay';

const throws: ReplayThrow[] = [
    { r: 0, result: { kind: 'hit', cupId: 9, bounce: false }, island: false, trick: false },
    { r: 0, result: { kind: 'rim', rolledBack: true }, island: false, trick: false },
    { r: 0, result: { kind: 'hit', cupId: 3, bounce: false }, island: false, trick: true },
    { r: 1, result: { kind: 'miss' }, island: true, trick: false },
    { r: 1, result: { kind: 'hit', cupId: 8, bounce: true }, island: false, trick: false },
];

describe('Aufzeichnung', () => {
    it('übersteht den Weg über JSON', () => {
        expect(parseReplay(JSON.stringify(throws))).toEqual(throws);
    });

    it('zählt Runden, Treffer und Würfe je Runde', () => {
        expect(roundsOf(throws)).toBe(2);
        expect(hitsOf(throws)).toBe(3);
        expect(throwsOfRound(throws, 0)).toHaveLength(3);
        expect(throwsOfRound(throws, 1).map(t => t.island)).toEqual([true, false]);
    });

    it('verwirft ungültige Daten', () => {
        expect(parseReplay(null)).toBeNull();
        expect(parseReplay('kein json')).toBeNull();
        expect(parseReplay('[]')).toBeNull();
        expect(parseReplay('{"r":0}')).toBeNull();
        expect(parseReplay(JSON.stringify([{ r: -1, result: { kind: 'miss' } }]))).toBeNull();
        expect(parseReplay(JSON.stringify([{ r: 0, result: { kind: 'hit', cupId: 'x', bounce: false } }]))).toBeNull();
        expect(parseReplay(JSON.stringify([{ r: 0, result: { kind: 'blocked', cupId: 1, ownCupLost: null } }]))).toBeNull();
        expect(parseReplay(JSON.stringify(Array.from({ length: 401 }, () => throws[0])))).toBeNull();
    });
});
