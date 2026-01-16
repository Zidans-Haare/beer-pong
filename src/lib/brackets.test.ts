import { describe, it, expect, beforeEach } from 'vitest';
import {
    generateSingleEliminationBracket,
    generateRoundRobinMatches,
    generateGroupStageMatches,
    MatchInput
} from './brackets';

// Helper to create mock players
const createPlayers = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: `player-${i + 1}` }));

// Helper to get unique player IDs from matches
const getUniquePlayerIds = (matches: MatchInput[]) => {
    const ids = new Set<string>();
    matches.forEach(m => {
        if (m.player1Id) ids.add(m.player1Id);
        if (m.player2Id) ids.add(m.player2Id);
    });
    return ids;
};

// Helper to count matches per round
const countMatchesPerRound = (matches: MatchInput[]) => {
    const counts: Record<number, number> = {};
    matches.forEach(m => {
        counts[m.round] = (counts[m.round] || 0) + 1;
    });
    return counts;
};

describe('Single Elimination Bracket', () => {
    const tournamentId = 'test-tournament';

    describe('Power of 2 players (no byes needed)', () => {
        it('should generate correct bracket for 2 players', () => {
            const players = createPlayers(2);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // 2 players = 1 round, 1 match (final) + no 3rd place (only 1 round)
            expect(matches.length).toBe(1);
            expect(matches[0].round).toBe(1);
            expect(matches[0].stage).toBe('BRACKET');
            expect(matches[0].player1Id).toBeTruthy();
            expect(matches[0].player2Id).toBeTruthy();
        });

        it('should generate correct bracket for 4 players', () => {
            const players = createPlayers(4);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // 4 players: 2 rounds
            // Round 1: 2 matches (semi-finals)
            // Round 2: 1 match (final) + 1 match (3rd place) = 2 matches
            // Total: 4 matches
            expect(matches.length).toBe(4);

            const roundCounts = countMatchesPerRound(matches);
            expect(roundCounts[1]).toBe(2); // Semi-finals
            expect(roundCounts[2]).toBe(2); // Final + 3rd place

            // All first round matches should have players assigned
            const r1Matches = matches.filter(m => m.round === 1);
            r1Matches.forEach(m => {
                expect(m.player1Id).toBeTruthy();
                expect(m.player2Id).toBeTruthy();
                expect(m.isPlayed).toBe(false);
            });

            // Second round matches should be placeholders
            const r2Matches = matches.filter(m => m.round === 2);
            r2Matches.forEach(m => {
                expect(m.player1Id).toBeNull();
                expect(m.player2Id).toBeNull();
            });
        });

        it('should generate correct bracket for 8 players', () => {
            const players = createPlayers(8);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // 8 players: 3 rounds
            // Round 1: 4 matches (quarter-finals)
            // Round 2: 2 matches (semi-finals)
            // Round 3: 2 matches (final + 3rd place)
            // Total: 8 matches
            expect(matches.length).toBe(8);

            const roundCounts = countMatchesPerRound(matches);
            expect(roundCounts[1]).toBe(4);
            expect(roundCounts[2]).toBe(2);
            expect(roundCounts[3]).toBe(2);
        });

        it('should generate correct bracket for 16 players', () => {
            const players = createPlayers(16);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // 16 players: 4 rounds
            // Round 1: 8 matches
            // Round 2: 4 matches
            // Round 3: 2 matches
            // Round 4: 2 matches (final + 3rd place)
            // Total: 16 matches
            expect(matches.length).toBe(16);

            const roundCounts = countMatchesPerRound(matches);
            expect(roundCounts[1]).toBe(8);
            expect(roundCounts[2]).toBe(4);
            expect(roundCounts[3]).toBe(2);
            expect(roundCounts[4]).toBe(2);
        });
    });

    describe('Non-power of 2 players (byes required)', () => {
        it('should handle 3 players with 1 bye', () => {
            const players = createPlayers(3);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // 3 players -> bracket size 4 (next power of 2)
            // Round 1: 2 matches, 1 with bye
            // Round 2: 2 matches (final + 3rd place)
            expect(matches.length).toBe(4);

            const r1Matches = matches.filter(m => m.round === 1);
            expect(r1Matches.length).toBe(2);

            // One match should be a bye (player1 set, player2 null, isPlayed=true, winnerId set)
            const byeMatches = r1Matches.filter(m => m.isPlayed && m.winnerId);
            expect(byeMatches.length).toBe(1);
            expect(byeMatches[0].player1Id).toBeTruthy();
            expect(byeMatches[0].player2Id).toBeNull();
            expect(byeMatches[0].winnerId).toBe(byeMatches[0].player1Id);
        });

        it('should handle 5 players with 3 byes', () => {
            const players = createPlayers(5);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // 5 players -> bracket size 8
            // Round 1: 4 matches, 3 with byes
            const r1Matches = matches.filter(m => m.round === 1);
            expect(r1Matches.length).toBe(4);

            const byeMatches = r1Matches.filter(m => m.isPlayed && m.winnerId);
            expect(byeMatches.length).toBe(3);
        });

        it('should handle 6 players with 2 byes', () => {
            const players = createPlayers(6);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // 6 players -> bracket size 8
            const r1Matches = matches.filter(m => m.round === 1);
            const byeMatches = r1Matches.filter(m => m.isPlayed && m.winnerId);
            expect(byeMatches.length).toBe(2);
        });

        it('should handle 7 players with 1 bye', () => {
            const players = createPlayers(7);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // 7 players -> bracket size 8
            const r1Matches = matches.filter(m => m.round === 1);
            const byeMatches = r1Matches.filter(m => m.isPlayed && m.winnerId);
            expect(byeMatches.length).toBe(1);
        });

        it('should handle 9 players correctly', () => {
            const players = createPlayers(9);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // 9 players -> bracket size 16
            // Round 1: 8 matches, 7 byes
            const r1Matches = matches.filter(m => m.round === 1);
            expect(r1Matches.length).toBe(8);

            const byeMatches = r1Matches.filter(m => m.isPlayed && m.winnerId);
            expect(byeMatches.length).toBe(7);

            // Only 2 actual matches in first round
            const realMatches = r1Matches.filter(m => !m.isPlayed);
            expect(realMatches.length).toBe(1);
        });
    });

    describe('3rd Place Match', () => {
        it('should include 3rd place match for 4+ players', () => {
            const players = createPlayers(4);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            const finalRound = Math.max(...matches.map(m => m.round));
            const finalRoundMatches = matches.filter(m => m.round === finalRound);

            // Should have 2 matches in final round: final (pos 0) and 3rd place (pos 1)
            expect(finalRoundMatches.length).toBe(2);
            expect(finalRoundMatches.find(m => m.position === 0)).toBeTruthy(); // Final
            expect(finalRoundMatches.find(m => m.position === 1)).toBeTruthy(); // 3rd place
        });

        it('should NOT include 3rd place match for 2 players', () => {
            const players = createPlayers(2);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // Only 1 match, no 3rd place needed
            expect(matches.length).toBe(1);
        });
    });

    describe('Player assignment', () => {
        it('should include all players in first round', () => {
            const players = createPlayers(8);
            const matches = generateSingleEliminationBracket(tournamentId, players);

            const assignedIds = getUniquePlayerIds(matches.filter(m => m.round === 1));
            expect(assignedIds.size).toBe(8);

            players.forEach(p => {
                expect(assignedIds.has(p.id)).toBe(true);
            });
        });

        it('should shuffle players (randomization check)', () => {
            const players = createPlayers(8);

            // Generate multiple brackets and check if order varies
            const firstMatchups: string[] = [];
            for (let i = 0; i < 10; i++) {
                const matches = generateSingleEliminationBracket(tournamentId, players);
                const r1m1 = matches.find(m => m.round === 1 && m.position === 0);
                firstMatchups.push(`${r1m1?.player1Id}-${r1m1?.player2Id}`);
            }

            // Should have at least 2 different matchups in 10 tries (very high probability)
            const uniqueMatchups = new Set(firstMatchups);
            expect(uniqueMatchups.size).toBeGreaterThan(1);
        });
    });
});

describe('Round Robin Matches', () => {
    const tournamentId = 'test-tournament';

    describe('Match count', () => {
        it('should generate correct number of matches for even players', () => {
            // n players = n*(n-1)/2 matches
            const testCases = [
                { players: 2, expected: 1 },
                { players: 4, expected: 6 },
                { players: 6, expected: 15 },
                { players: 8, expected: 28 },
            ];

            testCases.forEach(({ players, expected }) => {
                const p = createPlayers(players);
                const matches = generateRoundRobinMatches(tournamentId, p.map(x => x.id), false);
                expect(matches.length).toBe(expected);
            });
        });

        it('should generate correct number of matches for odd players', () => {
            // n players (odd) = (n-1)*n/2 matches (same formula)
            const testCases = [
                { players: 3, expected: 3 },
                { players: 5, expected: 10 },
                { players: 7, expected: 21 },
            ];

            testCases.forEach(({ players, expected }) => {
                const p = createPlayers(players);
                const matches = generateRoundRobinMatches(tournamentId, p.map(x => x.id), false);
                expect(matches.length).toBe(expected);
            });
        });

        it('should double matches with return leg', () => {
            const players = createPlayers(4);
            const matchesWithoutReturn = generateRoundRobinMatches(tournamentId, players.map(x => x.id), false);
            const matchesWithReturn = generateRoundRobinMatches(tournamentId, players.map(x => x.id), true);

            expect(matchesWithReturn.length).toBe(matchesWithoutReturn.length * 2);
        });
    });

    describe('Every player vs every other player', () => {
        it('should pair every player against every other exactly once (no return leg)', () => {
            const players = createPlayers(6);
            const matches = generateRoundRobinMatches(tournamentId, players.map(x => x.id), false);

            // Create set of all pairings (sorted to handle order)
            const pairings = new Set<string>();
            matches.forEach(m => {
                const pair = [m.player1Id, m.player2Id].sort().join('-');
                pairings.add(pair);
            });

            // Should have n*(n-1)/2 unique pairings
            const expected = (6 * 5) / 2; // 15
            expect(pairings.size).toBe(expected);

            // Verify each pair of players is matched exactly once
            for (let i = 0; i < players.length; i++) {
                for (let j = i + 1; j < players.length; j++) {
                    const pair = [players[i].id, players[j].id].sort().join('-');
                    expect(pairings.has(pair)).toBe(true);
                }
            }
        });

        it('should pair every player against every other exactly twice (with return leg)', () => {
            const players = createPlayers(4);
            const matches = generateRoundRobinMatches(tournamentId, players.map(x => x.id), true);

            // Count pairings (not considering home/away)
            const pairingCounts: Record<string, number> = {};
            matches.forEach(m => {
                const pair = [m.player1Id, m.player2Id].sort().join('-');
                pairingCounts[pair] = (pairingCounts[pair] || 0) + 1;
            });

            // Each pairing should appear exactly twice
            Object.values(pairingCounts).forEach(count => {
                expect(count).toBe(2);
            });
        });
    });

    describe('Round structure', () => {
        it('should have n-1 rounds for n players (even)', () => {
            const players = createPlayers(6);
            const matches = generateRoundRobinMatches(tournamentId, players.map(x => x.id), false);

            const rounds = new Set(matches.map(m => m.round));
            expect(rounds.size).toBe(5); // 6-1 = 5 rounds
        });

        it('should have n-1 rounds for n players (odd, with virtual bye)', () => {
            const players = createPlayers(5);
            const matches = generateRoundRobinMatches(tournamentId, players.map(x => x.id), false);

            const rounds = new Set(matches.map(m => m.round));
            // 5 players + 1 virtual = 6, so 5 rounds
            expect(rounds.size).toBe(5);
        });
    });

    describe('Stage assignment', () => {
        it('should mark all matches as LEAGUE stage', () => {
            const players = createPlayers(4);
            const matches = generateRoundRobinMatches(tournamentId, players.map(x => x.id), false);

            matches.forEach(m => {
                expect(m.stage).toBe('LEAGUE');
            });
        });
    });
});

describe('Group Stage Matches', () => {
    const tournamentId = 'test-tournament';

    describe('Group splitting', () => {
        it('should split even number of players into 2 equal groups', () => {
            const players = createPlayers(8);
            const matches = generateGroupStageMatches(tournamentId, players.map(x => x.id), false);

            const group1Matches = matches.filter(m => m.stage === 'GROUP_1');
            const group2Matches = matches.filter(m => m.stage === 'GROUP_2');

            // 4 players per group = 6 matches per group
            expect(group1Matches.length).toBe(6);
            expect(group2Matches.length).toBe(6);
        });

        it('should split odd number of players (larger group in GROUP_2)', () => {
            const players = createPlayers(7);
            const matches = generateGroupStageMatches(tournamentId, players.map(x => x.id), false);

            const group1Matches = matches.filter(m => m.stage === 'GROUP_1');
            const group2Matches = matches.filter(m => m.stage === 'GROUP_2');

            // 3 players in group 1 = 3 matches, 4 players in group 2 = 6 matches
            expect(group1Matches.length).toBe(3);
            expect(group2Matches.length).toBe(6);
        });

        it('should handle 4 players (minimum for groups)', () => {
            const players = createPlayers(4);
            const matches = generateGroupStageMatches(tournamentId, players.map(x => x.id), false);

            // 2 players per group = 1 match per group
            const group1Matches = matches.filter(m => m.stage === 'GROUP_1');
            const group2Matches = matches.filter(m => m.stage === 'GROUP_2');

            expect(group1Matches.length).toBe(1);
            expect(group2Matches.length).toBe(1);
        });
    });

    describe('Correct stage labels', () => {
        it('should use GROUP_1 and GROUP_2 stages', () => {
            const players = createPlayers(8);
            const matches = generateGroupStageMatches(tournamentId, players.map(x => x.id), false);

            const stages = new Set(matches.map(m => m.stage));
            expect(stages.has('GROUP_1')).toBe(true);
            expect(stages.has('GROUP_2')).toBe(true);
            expect(stages.size).toBe(2);
        });
    });

    describe('No overlap between groups', () => {
        it('should ensure no player appears in both groups', () => {
            const players = createPlayers(10);
            const matches = generateGroupStageMatches(tournamentId, players.map(x => x.id), false);

            const group1Players = new Set<string>();
            const group2Players = new Set<string>();

            matches.forEach(m => {
                if (m.stage === 'GROUP_1') {
                    if (m.player1Id) group1Players.add(m.player1Id);
                    if (m.player2Id) group1Players.add(m.player2Id);
                } else if (m.stage === 'GROUP_2') {
                    if (m.player1Id) group2Players.add(m.player1Id);
                    if (m.player2Id) group2Players.add(m.player2Id);
                }
            });

            // Check no overlap
            group1Players.forEach(p => {
                expect(group2Players.has(p)).toBe(false);
            });
        });

        it('should include all players across both groups', () => {
            const players = createPlayers(10);
            const matches = generateGroupStageMatches(tournamentId, players.map(x => x.id), false);

            const allPlayers = getUniquePlayerIds(matches);
            expect(allPlayers.size).toBe(10);

            players.forEach(p => {
                expect(allPlayers.has(p.id)).toBe(true);
            });
        });
    });

    describe('Return leg support', () => {
        it('should double matches with return leg', () => {
            const players = createPlayers(6);
            const matchesWithout = generateGroupStageMatches(tournamentId, players.map(x => x.id), false);
            const matchesWith = generateGroupStageMatches(tournamentId, players.map(x => x.id), true);

            expect(matchesWith.length).toBe(matchesWithout.length * 2);
        });
    });
});

describe('Match Position Uniqueness', () => {
    const tournamentId = 'test-tournament';

    it('should have unique positions within each round for elimination', () => {
        const players = createPlayers(8);
        const matches = generateSingleEliminationBracket(tournamentId, players);

        const roundPositions: Record<number, Set<number>> = {};
        matches.forEach(m => {
            if (!roundPositions[m.round]) {
                roundPositions[m.round] = new Set();
            }
            expect(roundPositions[m.round].has(m.position)).toBe(false);
            roundPositions[m.round].add(m.position);
        });
    });

    it('should have unique positions for round robin matches', () => {
        const players = createPlayers(6);
        const matches = generateRoundRobinMatches(tournamentId, players.map(x => x.id), false);

        const positions = new Set<number>();
        matches.forEach(m => {
            expect(positions.has(m.position)).toBe(false);
            positions.add(m.position);
        });
    });

    it('should have unique positions for group stage matches', () => {
        const players = createPlayers(8);
        const matches = generateGroupStageMatches(tournamentId, players.map(x => x.id), false);

        const positions = new Set<number>();
        matches.forEach(m => {
            expect(positions.has(m.position)).toBe(false);
            positions.add(m.position);
        });
    });
});

describe('Tournament ID propagation', () => {
    it('should set tournamentId on all matches', () => {
        const tournamentId = 'unique-tournament-123';

        const elimination = generateSingleEliminationBracket(tournamentId, createPlayers(8));
        elimination.forEach(m => expect(m.tournamentId).toBe(tournamentId));

        const roundRobin = generateRoundRobinMatches(tournamentId, createPlayers(6).map(x => x.id), false);
        roundRobin.forEach(m => expect(m.tournamentId).toBe(tournamentId));

        const groups = generateGroupStageMatches(tournamentId, createPlayers(8).map(x => x.id), false);
        groups.forEach(m => expect(m.tournamentId).toBe(tournamentId));
    });
});

describe('Edge Cases', () => {
    const tournamentId = 'test-tournament';

    it('should handle 1 player (degenerate case)', () => {
        const players = createPlayers(1);
        const matches = generateSingleEliminationBracket(tournamentId, players);

        // 1 player -> bracket size 2, 1 bye match
        expect(matches.length).toBe(1);
        expect(matches[0].isPlayed).toBe(true);
        expect(matches[0].winnerId).toBe(players[0].id);
    });

    it('should handle empty player list gracefully', () => {
        const matches = generateSingleEliminationBracket(tournamentId, []);

        // Should return empty or minimal structure
        expect(matches.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle large tournaments (32 players)', () => {
        const players = createPlayers(32);
        const matches = generateSingleEliminationBracket(tournamentId, players);

        // 32 players: 5 rounds
        // R1: 16, R2: 8, R3: 4, R4: 2, R5: 2 (final + 3rd) = 32 matches
        expect(matches.length).toBe(32);

        const roundCounts = countMatchesPerRound(matches);
        expect(roundCounts[1]).toBe(16);
        expect(roundCounts[2]).toBe(8);
        expect(roundCounts[3]).toBe(4);
        expect(roundCounts[4]).toBe(2);
        expect(roundCounts[5]).toBe(2);
    });
});
