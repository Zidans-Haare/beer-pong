import { describe, it, expect } from 'vitest';
import { calculateTournamentDuration, formatDuration, getEstimatedEndTime } from './estimation';

describe('calculateTournamentDuration', () => {
    describe('SINGLE_ELIMINATION', () => {
        it('calculates duration for 8 players with 1 table', () => {
            // 8 players = 3 rounds (4 + 2 + 1 matches = 7 matches, sequential)
            const duration = calculateTournamentDuration('SINGLE_ELIMINATION', 8, 1, 12);
            // Round 1: 4 matches = 4 * 12 = 48 min
            // Round 2: 2 matches = 2 * 12 = 24 min
            // Round 3: 1 match = 1 * 12 = 12 min
            // Total: 84 min
            expect(duration).toBe(84);
        });

        it('calculates duration for 8 players with 2 tables', () => {
            // 8 players = 3 rounds
            const duration = calculateTournamentDuration('SINGLE_ELIMINATION', 8, 2, 12);
            // Round 1: 4 matches / 2 tables = 2 slots * 12 = 24 min
            // Round 2: 2 matches / 2 tables = 1 slot * 12 = 12 min
            // Round 3: 1 match = 1 * 12 = 12 min
            // Total: 48 min
            expect(duration).toBe(48);
        });

        it('doubles duration with return leg', () => {
            const withoutReturnLeg = calculateTournamentDuration('SINGLE_ELIMINATION', 8, 1, 12, false);
            const withReturnLeg = calculateTournamentDuration('SINGLE_ELIMINATION', 8, 1, 12, true);
            expect(withReturnLeg).toBe(withoutReturnLeg * 2);
        });
    });

    describe('ROUND_ROBIN', () => {
        it('calculates duration for 4 players with 1 table', () => {
            // 4 players = 6 matches (4 * 3 / 2)
            const duration = calculateTournamentDuration('ROUND_ROBIN', 4, 1, 12);
            // max parallel = min(1, 2) = 1
            // 6 rounds * 12 = 72 min
            expect(duration).toBe(72);
        });

        it('calculates duration for 4 players with 2 tables', () => {
            // 4 players = 6 matches
            const duration = calculateTournamentDuration('ROUND_ROBIN', 4, 2, 12);
            // max parallel = min(2, 2) = 2
            // 3 rounds * 12 = 36 min
            expect(duration).toBe(36);
        });

        it('doubles matches with return leg', () => {
            const withoutReturnLeg = calculateTournamentDuration('ROUND_ROBIN', 4, 1, 12, false);
            const withReturnLeg = calculateTournamentDuration('ROUND_ROBIN', 4, 1, 12, true);
            expect(withReturnLeg).toBe(withoutReturnLeg * 2);
        });
    });

    describe('GROUPS', () => {
        it('calculates duration for 8 players with 2 tables', () => {
            // 8 players = 2 groups of 4
            // Each group: 4 * 3 / 2 = 6 matches
            // Total group matches: 12
            const duration = calculateTournamentDuration('GROUPS', 8, 2, 12);
            // Group phase: ceil(12 / 2) * 12 = 6 * 12 = 72 min
            // K.O. phase: 2 * 12 = 24 min (semi + final/3rd)
            // Total: 96 min
            expect(duration).toBe(96);
        });

        it('calculates duration for 9 players with 2 tables', () => {
            // 9 players = groups of 4 and 5
            // Group 1: 4 * 3 / 2 = 6 matches
            // Group 2: 5 * 4 / 2 = 10 matches
            // Total group matches: 16
            const duration = calculateTournamentDuration('GROUPS', 9, 2, 12);
            // Group phase: ceil(16 / 2) * 12 = 8 * 12 = 96 min
            // K.O. phase: 2 * 12 = 24 min
            // Total: 120 min
            expect(duration).toBe(120);
        });

        it('doubles group matches with return leg', () => {
            const withoutReturnLeg = calculateTournamentDuration('GROUPS', 8, 2, 12, false);
            const withReturnLeg = calculateTournamentDuration('GROUPS', 8, 2, 12, true);

            // Without return leg: group=72, ko=24, total=96
            // With return leg: group=144, ko=24, total=168 (K.O. phase stays same)
            expect(withoutReturnLeg).toBe(96);
            expect(withReturnLeg).toBe(168);

            // K.O. stays 24, groups double from 72 to 144
            // So withReturnLeg = withoutReturnLeg + 72 (doubled groups minus original groups)
            expect(withReturnLeg).toBe(withoutReturnLeg + 72);
        });

        it('return leg only affects group phase, not K.O. phase', () => {
            // The K.O. phase should be the same regardless of return leg setting
            // We can verify this by checking that the difference equals exactly the group matches
            const duration8NoReturn = calculateTournamentDuration('GROUPS', 8, 2, 12, false);
            const duration8WithReturn = calculateTournamentDuration('GROUPS', 8, 2, 12, true);

            // Group matches for 8 players: 12 total
            // With 2 tables: ceil(12/2) * 12 = 72 min for groups
            // With return leg: ceil(24/2) * 12 = 144 min for groups
            // Difference should be 72 (the original group duration)
            expect(duration8WithReturn - duration8NoReturn).toBe(72);
        });
    });

    describe('edge cases', () => {
        it('returns 0 for less than 2 players', () => {
            expect(calculateTournamentDuration('SINGLE_ELIMINATION', 0, 1, 12)).toBe(0);
            expect(calculateTournamentDuration('SINGLE_ELIMINATION', 1, 1, 12)).toBe(0);
        });

        it('handles different match durations', () => {
            const duration15min = calculateTournamentDuration('SINGLE_ELIMINATION', 4, 1, 15);
            const duration10min = calculateTournamentDuration('SINGLE_ELIMINATION', 4, 1, 10);
            // 4 players = 2 rounds (2 + 1 = 3 matches)
            expect(duration15min).toBe(45); // 3 * 15
            expect(duration10min).toBe(30); // 3 * 10
        });
    });
});

describe('formatDuration', () => {
    it('formats minutes only', () => {
        expect(formatDuration(45)).toBe('45 Min');
    });

    it('formats hours and minutes', () => {
        expect(formatDuration(90)).toBe('1 Std 30 Min');
    });

    it('formats full hours without minutes', () => {
        expect(formatDuration(120)).toBe('2 Std ');
    });

    it('handles zero', () => {
        expect(formatDuration(0)).toBe('0 Min');
    });
});

describe('getEstimatedEndTime', () => {
    it('returns a time string in HH:MM format', () => {
        const endTime = getEstimatedEndTime(60);
        // Should match pattern like "14:30"
        expect(endTime).toMatch(/^\d{2}:\d{2}$/);
    });
});

/**
 * Diese Tests validieren die "Zeit-Prognose" im UI (DurationForecast Komponente)
 * Sie stellen sicher, dass die angezeigten Werte korrekt sind für realistische Szenarien.
 */
describe('Zeit-Prognose UI Szenarien', () => {
    // Default UI values: 8 players, 15 min match duration (from system settings)
    const defaultMatchDuration = 15;

    describe('mit 1 Tisch', () => {
        const tableCount = 1;

        it('K.O. System - ohne Rückrunde', () => {
            const duration = calculateTournamentDuration('SINGLE_ELIMINATION', 8, tableCount, defaultMatchDuration, false);
            // 8 players, 1 table: 4+2+1 = 7 matches * 15 min = 105 min
            expect(duration).toBe(105);
            expect(formatDuration(duration)).toBe('1 Std 45 Min');
        });

        it('K.O. System - mit Rückrunde', () => {
            const duration = calculateTournamentDuration('SINGLE_ELIMINATION', 8, tableCount, defaultMatchDuration, true);
            // Double: 210 min
            expect(duration).toBe(210);
            expect(formatDuration(duration)).toBe('3 Std 30 Min');
        });

        it('Jeder gegen Jeden - ohne Rückrunde', () => {
            const duration = calculateTournamentDuration('ROUND_ROBIN', 8, tableCount, defaultMatchDuration, false);
            // 8 players = 28 matches, 1 table, max parallel = 1
            // 28 rounds * 15 = 420 min
            expect(duration).toBe(420);
            expect(formatDuration(duration)).toBe('7 Std ');
        });

        it('Jeder gegen Jeden - mit Rückrunde', () => {
            const duration = calculateTournamentDuration('ROUND_ROBIN', 8, tableCount, defaultMatchDuration, true);
            // 56 matches * 15 = 840 min
            expect(duration).toBe(840);
            expect(formatDuration(duration)).toBe('14 Std ');
        });

        it('Gruppenphase + K.O. - ohne Rückrunde', () => {
            const duration = calculateTournamentDuration('GROUPS', 8, tableCount, defaultMatchDuration, false);
            // 12 group matches + KO (2 rounds)
            // ceil(12/1) * 15 + 2 * 15 = 180 + 30 = 210 min
            expect(duration).toBe(210);
            expect(formatDuration(duration)).toBe('3 Std 30 Min');
        });

        it('Gruppenphase + K.O. - mit Rückrunde', () => {
            const duration = calculateTournamentDuration('GROUPS', 8, tableCount, defaultMatchDuration, true);
            // 24 group matches + KO (unchanged)
            // ceil(24/1) * 15 + 2 * 15 = 360 + 30 = 390 min
            expect(duration).toBe(390);
            expect(formatDuration(duration)).toBe('6 Std 30 Min');
        });
    });

    describe('mit 2 Tischen', () => {
        const tableCount = 2;

        it('K.O. System - ohne Rückrunde', () => {
            const duration = calculateTournamentDuration('SINGLE_ELIMINATION', 8, tableCount, defaultMatchDuration, false);
            // Round 1: 4/2=2 slots, Round 2: 2/2=1 slot, Round 3: 1 slot = 4 * 15 = 60 min
            expect(duration).toBe(60);
            expect(formatDuration(duration)).toBe('1 Std ');
        });

        it('K.O. System - mit Rückrunde', () => {
            const duration = calculateTournamentDuration('SINGLE_ELIMINATION', 8, tableCount, defaultMatchDuration, true);
            expect(duration).toBe(120);
            expect(formatDuration(duration)).toBe('2 Std ');
        });

        it('Jeder gegen Jeden - ohne Rückrunde', () => {
            const duration = calculateTournamentDuration('ROUND_ROBIN', 8, tableCount, defaultMatchDuration, false);
            // 28 matches, max parallel = min(2, 4) = 2
            // ceil(28/2) * 15 = 14 * 15 = 210 min
            expect(duration).toBe(210);
            expect(formatDuration(duration)).toBe('3 Std 30 Min');
        });

        it('Jeder gegen Jeden - mit Rückrunde', () => {
            const duration = calculateTournamentDuration('ROUND_ROBIN', 8, tableCount, defaultMatchDuration, true);
            // 56 matches, ceil(56/2) * 15 = 28 * 15 = 420 min
            expect(duration).toBe(420);
            expect(formatDuration(duration)).toBe('7 Std ');
        });

        it('Gruppenphase + K.O. - ohne Rückrunde', () => {
            const duration = calculateTournamentDuration('GROUPS', 8, tableCount, defaultMatchDuration, false);
            // 12 group matches, ceil(12/2) * 15 + 2 * 15 = 90 + 30 = 120 min
            expect(duration).toBe(120);
            expect(formatDuration(duration)).toBe('2 Std ');
        });

        it('Gruppenphase + K.O. - mit Rückrunde', () => {
            const duration = calculateTournamentDuration('GROUPS', 8, tableCount, defaultMatchDuration, true);
            // 24 group matches, ceil(24/2) * 15 + 2 * 15 = 180 + 30 = 210 min
            expect(duration).toBe(210);
            expect(formatDuration(duration)).toBe('3 Std 30 Min');
        });
    });

    describe('mit 9 Spielern (ungleiche Gruppen)', () => {
        const tableCount = 2;

        it('Gruppenphase + K.O. - ohne Rückrunde', () => {
            // Group 1: 4 players = 6 matches
            // Group 2: 5 players = 10 matches
            // Total: 16 matches
            const duration = calculateTournamentDuration('GROUPS', 9, tableCount, defaultMatchDuration, false);
            // ceil(16/2) * 15 + 2 * 15 = 120 + 30 = 150 min
            expect(duration).toBe(150);
            expect(formatDuration(duration)).toBe('2 Std 30 Min');
        });

        it('Gruppenphase + K.O. - mit Rückrunde', () => {
            // 32 group matches
            const duration = calculateTournamentDuration('GROUPS', 9, tableCount, defaultMatchDuration, true);
            // ceil(32/2) * 15 + 2 * 15 = 240 + 30 = 270 min
            expect(duration).toBe(270);
            expect(formatDuration(duration)).toBe('4 Std 30 Min');
        });
    });

    describe('Rückrunde verdoppelt korrekt', () => {
        const configs = [
            { type: 'SINGLE_ELIMINATION', players: 8, tables: 2 },
            { type: 'ROUND_ROBIN', players: 8, tables: 2 },
            { type: 'GROUPS', players: 8, tables: 2 },
            { type: 'GROUPS', players: 9, tables: 2 },
        ];

        configs.forEach(({ type, players, tables }) => {
            it(`${type} mit ${players} Spielern: Rückrunde erhöht die Zeit`, () => {
                const ohne = calculateTournamentDuration(type, players, tables, defaultMatchDuration, false);
                const mit = calculateTournamentDuration(type, players, tables, defaultMatchDuration, true);

                expect(mit).toBeGreaterThan(ohne);

                // Für GROUPS: K.O. bleibt gleich (30 min), nur Gruppenphase verdoppelt
                if (type === 'GROUPS') {
                    const koDuration = 2 * defaultMatchDuration; // 30 min
                    const gruppenOhne = ohne - koDuration;
                    const gruppenMit = mit - koDuration;
                    expect(gruppenMit).toBe(gruppenOhne * 2);
                } else {
                    // Für andere: komplett verdoppelt
                    expect(mit).toBe(ohne * 2);
                }
            });
        });
    });
});
