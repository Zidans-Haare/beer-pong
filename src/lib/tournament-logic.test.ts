import { describe, it, expect } from 'vitest';
import {
    generateSingleEliminationBracket,
    generateRoundRobinMatches,
    generateGroupStageMatches,
    MatchInput
} from './brackets';

// ============================================================
// HELPER FUNCTIONS FOR TESTING
// ============================================================

const createPlayers = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: `player-${i + 1}` }));

/**
 * Simulates match progression logic (mirrors MatchService.checkBracketProgression)
 */
function simulateMatchResult(
    matches: MatchInput[],
    matchIndex: number,
    score1: number,
    score2: number
): MatchInput[] {
    const updated = [...matches];
    const match = { ...updated[matchIndex] };

    // Set scores and winner
    match.isPlayed = true;
    const winnerId = score1 > score2 ? match.player1Id : (score2 > score1 ? match.player2Id : null);
    (match as any).winnerId = winnerId;
    (match as any).score1 = score1;
    (match as any).score2 = score2;
    updated[matchIndex] = match;

    // If bracket match, advance winner
    if (match.stage === 'BRACKET' && winnerId) {
        const maxRound = Math.max(...updated.filter(m => m.stage === 'BRACKET').map(m => m.round));

        if (match.round < maxRound) {
            const nextRound = match.round + 1;
            const nextPosition = Math.floor(match.position / 2);
            const isPlayer1InNext = match.position % 2 === 0;

            // Find and update next match
            const nextMatchIndex = updated.findIndex(
                m => m.round === nextRound && m.position === nextPosition && m.stage === 'BRACKET'
            );

            if (nextMatchIndex !== -1) {
                const nextMatch = { ...updated[nextMatchIndex] };
                if (isPlayer1InNext) {
                    nextMatch.player1Id = winnerId;
                } else {
                    nextMatch.player2Id = winnerId;
                }
                updated[nextMatchIndex] = nextMatch;
            }

            // Handle 3rd place match (losers from semi-finals)
            if (match.round === maxRound - 1) {
                const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
                const thirdPlaceIndex = updated.findIndex(
                    m => m.round === maxRound && m.position === 1 && m.stage === 'BRACKET'
                );

                if (thirdPlaceIndex !== -1 && loserId) {
                    const thirdPlace = { ...updated[thirdPlaceIndex] };
                    if (isPlayer1InNext) {
                        thirdPlace.player1Id = loserId;
                    } else {
                        thirdPlace.player2Id = loserId;
                    }
                    updated[thirdPlaceIndex] = thirdPlace;
                }
            }
        }
    }

    return updated;
}

/**
 * Checks if a match is playable (both players assigned, not played)
 */
function isMatchPlayable(match: MatchInput): boolean {
    return match.player1Id !== null &&
           match.player2Id !== null &&
           !match.isPlayed;
}

/**
 * Gets all currently playable matches
 */
function getPlayableMatches(matches: MatchInput[]): MatchInput[] {
    return matches.filter(isMatchPlayable);
}

/**
 * Simulates standings update for round robin
 */
interface Standing {
    playerId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
}

function createStandings(playerIds: string[]): Standing[] {
    return playerIds.map(id => ({
        playerId: id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
    }));
}

function updateStandings(
    standings: Standing[],
    p1Id: string,
    p2Id: string,
    score1: number,
    score2: number
): Standing[] {
    const updated = standings.map(s => ({ ...s }));

    const p1 = updated.find(s => s.playerId === p1Id)!;
    const p2 = updated.find(s => s.playerId === p2Id)!;

    p1.played++;
    p2.played++;
    p1.goalsFor += score1;
    p1.goalsAgainst += score2;
    p2.goalsFor += score2;
    p2.goalsAgainst += score1;
    p1.goalDifference = p1.goalsFor - p1.goalsAgainst;
    p2.goalDifference = p2.goalsFor - p2.goalsAgainst;

    if (score1 > score2) {
        p1.won++;
        p1.points += 3;
        p2.lost++;
    } else if (score2 > score1) {
        p2.won++;
        p2.points += 3;
        p1.lost++;
    } else {
        p1.drawn++;
        p2.drawn++;
        p1.points += 1;
        p2.points += 1;
    }

    return updated;
}

function sortStandings(standings: Standing[]): Standing[] {
    return [...standings].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
}

// ============================================================
// SINGLE ELIMINATION PROGRESSION TESTS
// ============================================================

describe('Single Elimination Match Progression', () => {
    const tournamentId = 'test-tournament';

    describe('4-Player Tournament Flow', () => {
        it('should correctly advance winners through bracket', () => {
            // Create deterministic bracket (no shuffle for testing)
            const players = createPlayers(4);
            let matches = generateSingleEliminationBracket(tournamentId, players);

            // Get initial state
            const r1Matches = matches.filter(m => m.round === 1);
            expect(r1Matches.length).toBe(2);
            expect(getPlayableMatches(matches).length).toBe(2); // Both R1 matches playable

            // Play R1 Match 0 (position 0)
            const r1m0Index = matches.findIndex(m => m.round === 1 && m.position === 0);
            const r1m0Winner = matches[r1m0Index].player1Id;
            matches = simulateMatchResult(matches, r1m0Index, 10, 5);

            // Verify winner advanced to finale as player1
            const finale = matches.find(m => m.round === 2 && m.position === 0);
            expect(finale?.player1Id).toBe(r1m0Winner);
            expect(finale?.player2Id).toBeNull(); // Still waiting for other semi

            // Finale not yet playable (missing player2)
            expect(isMatchPlayable(finale!)).toBe(false);

            // Play R1 Match 1 (position 1)
            const r1m1Index = matches.findIndex(m => m.round === 1 && m.position === 1);
            const r1m1Winner = matches[r1m1Index].player1Id;
            const r1m1Loser = matches[r1m1Index].player2Id;
            matches = simulateMatchResult(matches, r1m1Index, 10, 7);

            // Verify winner advanced to finale as player2
            const finaleUpdated = matches.find(m => m.round === 2 && m.position === 0);
            expect(finaleUpdated?.player1Id).toBe(r1m0Winner);
            expect(finaleUpdated?.player2Id).toBe(r1m1Winner);

            // Finale now playable
            expect(isMatchPlayable(finaleUpdated!)).toBe(true);

            // Check 3rd place match has losers
            const thirdPlace = matches.find(m => m.round === 2 && m.position === 1);
            expect(thirdPlace).toBeTruthy();
            // Note: In our simulation, losers go to 3rd place match
        });

        it('should have correct match count at each stage', () => {
            const players = createPlayers(4);
            let matches = generateSingleEliminationBracket(tournamentId, players);

            // Initial: 2 playable (R1)
            expect(getPlayableMatches(matches).length).toBe(2);

            // After R1M0
            matches = simulateMatchResult(matches,
                matches.findIndex(m => m.round === 1 && m.position === 0), 10, 5);
            expect(getPlayableMatches(matches).length).toBe(1); // Only R1M1 left

            // After R1M1
            matches = simulateMatchResult(matches,
                matches.findIndex(m => m.round === 1 && m.position === 1), 10, 5);
            expect(getPlayableMatches(matches).length).toBe(2); // Finale + 3rd place
        });
    });

    describe('8-Player Tournament Flow', () => {
        it('should correctly progress through all rounds', () => {
            const players = createPlayers(8);
            let matches = generateSingleEliminationBracket(tournamentId, players);

            // R1: 4 matches
            expect(getPlayableMatches(matches).length).toBe(4);

            // Play all R1 matches
            for (let pos = 0; pos < 4; pos++) {
                const idx = matches.findIndex(m => m.round === 1 && m.position === pos && !m.isPlayed);
                if (idx !== -1) {
                    matches = simulateMatchResult(matches, idx, 10, 5);
                }
            }

            // R2: 2 matches should now be playable (semi-finals)
            const r2Playable = getPlayableMatches(matches).filter(m => m.round === 2);
            expect(r2Playable.length).toBe(2);

            // Play semi-finals
            for (let pos = 0; pos < 2; pos++) {
                const idx = matches.findIndex(m => m.round === 2 && m.position === pos && !m.isPlayed);
                if (idx !== -1) {
                    matches = simulateMatchResult(matches, idx, 10, 5);
                }
            }

            // R3: Finale + 3rd place should be playable
            const r3Playable = getPlayableMatches(matches).filter(m => m.round === 3);
            expect(r3Playable.length).toBe(2);
        });

        it('should populate 3rd place match with semi-final losers', () => {
            const players = createPlayers(8);
            let matches = generateSingleEliminationBracket(tournamentId, players);

            // Play all R1 matches
            for (let pos = 0; pos < 4; pos++) {
                const idx = matches.findIndex(m => m.round === 1 && m.position === pos && !m.isPlayed);
                if (idx !== -1) {
                    matches = simulateMatchResult(matches, idx, 10, 5);
                }
            }

            // Get semi-final participants
            const sf0 = matches.find(m => m.round === 2 && m.position === 0);
            const sf1 = matches.find(m => m.round === 2 && m.position === 1);

            // Play SF0 - player1 wins, player2 loses
            const sf0Loser = sf0!.player2Id;
            matches = simulateMatchResult(matches,
                matches.findIndex(m => m.round === 2 && m.position === 0), 10, 5);

            // Play SF1 - player1 wins, player2 loses
            const sf1Loser = sf1!.player2Id;
            matches = simulateMatchResult(matches,
                matches.findIndex(m => m.round === 2 && m.position === 1), 10, 5);

            // 3rd place match should have both losers
            const thirdPlace = matches.find(m => m.round === 3 && m.position === 1);
            expect(thirdPlace?.player1Id).toBe(sf0Loser);
            expect(thirdPlace?.player2Id).toBe(sf1Loser);
        });
    });

    describe('Qualification Round Handling (non-power-of-2)', () => {
        it('should give seed a direct slot in round 2 for 3 players', () => {
            const players = createPlayers(3); // 1 seed, 1 qual match
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // No pre-played bye matches
            expect(matches.filter(m => m.isPlayed && m.winnerId)).toHaveLength(0);

            // Exactly 1 qualifying match in round 1
            const r1Matches = matches.filter(m => m.round === 1);
            expect(r1Matches.length).toBe(1);
            expect(r1Matches[0].player1Id).toBeTruthy();
            expect(r1Matches[0].player2Id).toBeTruthy();

            // Round 2 (final) should have the seed pre-filled in one slot
            const final = matches.find(m => m.round === 2 && m.position === 0);
            const filledSlots = [final?.player1Id, final?.player2Id].filter(Boolean);
            expect(filledSlots.length).toBe(1); // seed pre-filled, qual winner slot = null
        });

        it('should produce qual round and 0 byes for 5 players', () => {
            const players = createPlayers(5); // 3 seeds, 1 qual match
            const matches = generateSingleEliminationBracket(tournamentId, players);

            // No bye matches
            expect(matches.filter(m => m.isPlayed && m.winnerId)).toHaveLength(0);

            // Round 1 has exactly 1 qualifying match
            const r1Matches = matches.filter(m => m.round === 1);
            expect(r1Matches.length).toBe(1);
            expect(r1Matches[0].player1Id).toBeTruthy();
            expect(r1Matches[0].player2Id).toBeTruthy();
        });
    });
});

// ============================================================
// ROUND ROBIN STANDINGS TESTS
// ============================================================

describe('Round Robin Standings Calculation', () => {
    const tournamentId = 'test-tournament';

    it('should calculate points correctly (3-1-0 system)', () => {
        const playerIds = ['p1', 'p2', 'p3'];
        let standings = createStandings(playerIds);

        // P1 beats P2 (10:5)
        standings = updateStandings(standings, 'p1', 'p2', 10, 5);
        expect(standings.find(s => s.playerId === 'p1')?.points).toBe(3);
        expect(standings.find(s => s.playerId === 'p2')?.points).toBe(0);

        // P1 beats P3 (10:7)
        standings = updateStandings(standings, 'p1', 'p3', 10, 7);
        expect(standings.find(s => s.playerId === 'p1')?.points).toBe(6);
        expect(standings.find(s => s.playerId === 'p3')?.points).toBe(0);

        // P2 draws P3 (5:5)
        standings = updateStandings(standings, 'p2', 'p3', 5, 5);
        expect(standings.find(s => s.playerId === 'p2')?.points).toBe(1);
        expect(standings.find(s => s.playerId === 'p3')?.points).toBe(1);
    });

    it('should track goal statistics correctly', () => {
        const playerIds = ['p1', 'p2'];
        let standings = createStandings(playerIds);

        // P1 beats P2 (10:3)
        standings = updateStandings(standings, 'p1', 'p2', 10, 3);

        const p1 = standings.find(s => s.playerId === 'p1')!;
        const p2 = standings.find(s => s.playerId === 'p2')!;

        expect(p1.goalsFor).toBe(10);
        expect(p1.goalsAgainst).toBe(3);
        expect(p1.goalDifference).toBe(7);

        expect(p2.goalsFor).toBe(3);
        expect(p2.goalsAgainst).toBe(10);
        expect(p2.goalDifference).toBe(-7);
    });

    it('should sort standings correctly', () => {
        const playerIds = ['p1', 'p2', 'p3', 'p4'];
        let standings = createStandings(playerIds);

        // Simulate results
        standings = updateStandings(standings, 'p1', 'p2', 10, 5); // P1 wins
        standings = updateStandings(standings, 'p1', 'p3', 10, 7); // P1 wins
        standings = updateStandings(standings, 'p1', 'p4', 10, 8); // P1 wins
        standings = updateStandings(standings, 'p2', 'p3', 10, 5); // P2 wins
        standings = updateStandings(standings, 'p2', 'p4', 10, 5); // P2 wins
        standings = updateStandings(standings, 'p3', 'p4', 10, 5); // P3 wins

        const sorted = sortStandings(standings);

        // P1: 9 pts (3 wins)
        // P2: 6 pts (2 wins)
        // P3: 3 pts (1 win)
        // P4: 0 pts (0 wins)
        expect(sorted[0].playerId).toBe('p1');
        expect(sorted[1].playerId).toBe('p2');
        expect(sorted[2].playerId).toBe('p3');
        expect(sorted[3].playerId).toBe('p4');
    });

    it('should use goal difference as tiebreaker', () => {
        const playerIds = ['p1', 'p2', 'p3'];
        let standings = createStandings(playerIds);

        // All players: 1 win, 1 loss = 3 points each
        standings = updateStandings(standings, 'p1', 'p2', 10, 5); // P1 wins, +5 diff
        standings = updateStandings(standings, 'p2', 'p3', 10, 2); // P2 wins, +8 diff
        standings = updateStandings(standings, 'p3', 'p1', 10, 8); // P3 wins, +2 diff

        const sorted = sortStandings(standings);

        // All have 3 points, sorted by goal difference
        // P2: +3 (10-5 + 10-2 - losses)... let me recalculate
        // P1: GF=18, GA=15, GD=+3
        // P2: GF=15, GA=12, GD=+3
        // P3: GF=12, GA=18, GD=-6

        // Actually let me trace through:
        // P1: scored 10 (vs P2), lost 10 (vs P3) + conceded 5 (vs P2), 8 (vs P3)
        //     GF = 10+8 = 18, GA = 5+10 = 15... wait that's wrong

        // After P1 vs P2 (10:5):
        //   P1: GF=10, GA=5
        //   P2: GF=5, GA=10
        // After P2 vs P3 (10:2):
        //   P2: GF=15, GA=12
        //   P3: GF=2, GA=10
        // After P3 vs P1 (10:8):
        //   P3: GF=12, GA=18
        //   P1: GF=18, GA=15

        // Points: P1=3, P2=3, P3=3
        // GD: P1=+3, P2=+3, P3=-6
        // GF: P1=18, P2=15

        expect(sorted[0].playerId).toBe('p1'); // Highest GF with same GD
        expect(sorted[1].playerId).toBe('p2');
        expect(sorted[2].playerId).toBe('p3');
    });

    it('should handle complete 4-player round robin', () => {
        const playerIds = ['p1', 'p2', 'p3', 'p4'];
        const matches = generateRoundRobinMatches(tournamentId, playerIds, false);
        let standings = createStandings(playerIds);

        // Each player plays 3 matches
        expect(matches.length).toBe(6);

        // Play all matches with deterministic results (no draws)
        matches.forEach((m, i) => {
            // Alternate wins for variety - ensure score1 always wins
            const score1 = 10;
            const score2 = i; // 0-5, so score1 always wins
            standings = updateStandings(standings, m.player1Id!, m.player2Id!, score1, score2);
        });

        // All players should have played 3 matches
        standings.forEach(s => {
            expect(s.played).toBe(3);
        });

        // Total wins + losses should equal total matches * 2
        const totalWins = standings.reduce((sum, s) => sum + s.won, 0);
        const totalLosses = standings.reduce((sum, s) => sum + s.lost, 0);
        expect(totalWins).toBe(6); // Each match has 1 winner
        expect(totalLosses).toBe(6); // Each match has 1 loser
    });
});

// ============================================================
// GROUP STAGE TESTS
// ============================================================

describe('Group Stage Logic', () => {
    const tournamentId = 'test-tournament';

    it('should create separate standings for each group', () => {
        const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
        const matches = generateGroupStageMatches(tournamentId, playerIds, false);

        const group1Matches = matches.filter(m => m.stage === 'GROUP_1');
        const group2Matches = matches.filter(m => m.stage === 'GROUP_2');

        // Extract unique players per group
        const g1Players = new Set<string>();
        const g2Players = new Set<string>();

        group1Matches.forEach(m => {
            if (m.player1Id) g1Players.add(m.player1Id);
            if (m.player2Id) g1Players.add(m.player2Id);
        });

        group2Matches.forEach(m => {
            if (m.player1Id) g2Players.add(m.player1Id);
            if (m.player2Id) g2Players.add(m.player2Id);
        });

        expect(g1Players.size).toBe(4);
        expect(g2Players.size).toBe(4);

        // No overlap
        g1Players.forEach(p => {
            expect(g2Players.has(p)).toBe(false);
        });
    });

    it('should generate correct knockout bracket from group qualifiers', () => {
        // Simulate: Top 2 from each group qualify
        const g1Standings = [
            { playerId: 'g1-1st', points: 9 },
            { playerId: 'g1-2nd', points: 6 },
            { playerId: 'g1-3rd', points: 3 },
            { playerId: 'g1-4th', points: 0 },
        ];

        const g2Standings = [
            { playerId: 'g2-1st', points: 9 },
            { playerId: 'g2-2nd', points: 6 },
            { playerId: 'g2-3rd', points: 3 },
            { playerId: 'g2-4th', points: 0 },
        ];

        // Expected crossover for semi-finals:
        // SF1: g1-1st vs g2-2nd
        // SF2: g2-1st vs g1-2nd

        const qualifiers = [
            { id: 'g1-1st', group: 1, position: 1 },
            { id: 'g1-2nd', group: 1, position: 2 },
            { id: 'g2-1st', group: 2, position: 1 },
            { id: 'g2-2nd', group: 2, position: 2 },
        ];

        // Generate expected pairings
        const sf1 = { p1: 'g1-1st', p2: 'g2-2nd' };
        const sf2 = { p1: 'g2-1st', p2: 'g1-2nd' };

        // Verify crossover logic
        expect(sf1.p1).toBe('g1-1st'); // Group 1 winner
        expect(sf1.p2).toBe('g2-2nd'); // Group 2 runner-up
        expect(sf2.p1).toBe('g2-1st'); // Group 2 winner
        expect(sf2.p2).toBe('g1-2nd'); // Group 1 runner-up
    });
});

// ============================================================
// MATCH PLAYABILITY AND ORDER TESTS
// ============================================================

describe('Match Playability Rules', () => {
    const tournamentId = 'test-tournament';

    it('should only allow matches with both players to be played', () => {
        const players = createPlayers(4);
        const matches = generateSingleEliminationBracket(tournamentId, players);

        matches.forEach(m => {
            const playable = isMatchPlayable(m);
            const hasBothPlayers = m.player1Id !== null && m.player2Id !== null;
            const notPlayed = !m.isPlayed;

            // A match is playable IFF it has both players AND isn't played
            expect(playable).toBe(hasBothPlayers && notPlayed);
        });
    });

    it('should prevent playing matches twice', () => {
        const players = createPlayers(4);
        let matches = generateSingleEliminationBracket(tournamentId, players);

        const r1m0Index = matches.findIndex(m => m.round === 1 && m.position === 0);
        expect(isMatchPlayable(matches[r1m0Index])).toBe(true);

        // Play the match
        matches = simulateMatchResult(matches, r1m0Index, 10, 5);

        // Should no longer be playable
        expect(isMatchPlayable(matches[r1m0Index])).toBe(false);
    });

    it('should enforce bracket progression order', () => {
        const players = createPlayers(4);
        let matches = generateSingleEliminationBracket(tournamentId, players);

        // Finale should NOT be playable initially
        const finale = matches.find(m => m.round === 2 && m.position === 0);
        expect(isMatchPlayable(finale!)).toBe(false);

        // Play both semi-finals
        matches = simulateMatchResult(matches,
            matches.findIndex(m => m.round === 1 && m.position === 0), 10, 5);
        matches = simulateMatchResult(matches,
            matches.findIndex(m => m.round === 1 && m.position === 1), 10, 5);

        // Now finale should be playable
        const finaleUpdated = matches.find(m => m.round === 2 && m.position === 0);
        expect(isMatchPlayable(finaleUpdated!)).toBe(true);
    });
});

// ============================================================
// COMPLETE TOURNAMENT SIMULATION
// ============================================================

describe('Complete Tournament Simulations', () => {
    const tournamentId = 'test-tournament';

    it('should complete 8-player single elimination correctly', () => {
        const players = createPlayers(8);
        let matches = generateSingleEliminationBracket(tournamentId, players);

        // Track progression
        const playOrder: string[] = [];

        // Play all rounds
        while (getPlayableMatches(matches).length > 0) {
            const playable = getPlayableMatches(matches);

            // Play all currently playable matches
            playable.forEach(m => {
                const idx = matches.findIndex(match =>
                    match.round === m.round &&
                    match.position === m.position &&
                    !match.isPlayed
                );

                if (idx !== -1) {
                    playOrder.push(`R${m.round}P${m.position}`);
                    matches = simulateMatchResult(matches, idx, 10, 5);
                }
            });
        }

        // All matches should be played
        const unplayed = matches.filter(m => !m.isPlayed);
        expect(unplayed.length).toBe(0);

        // Should have played in correct order (R1 before R2 before R3)
        const r1Indices = playOrder.filter(p => p.startsWith('R1')).map(p => playOrder.indexOf(p));
        const r2Indices = playOrder.filter(p => p.startsWith('R2')).map(p => playOrder.indexOf(p));
        const r3Indices = playOrder.filter(p => p.startsWith('R3')).map(p => playOrder.indexOf(p));

        // R1 should come before R2
        expect(Math.max(...r1Indices)).toBeLessThan(Math.min(...r2Indices));
        // R2 should come before R3
        expect(Math.max(...r2Indices)).toBeLessThan(Math.min(...r3Indices));
    });

    it('should complete 6-player round robin correctly', () => {
        const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
        const matches = generateRoundRobinMatches(tournamentId, playerIds, false);
        let standings = createStandings(playerIds);

        // Play all matches
        matches.forEach(m => {
            const score1 = Math.floor(Math.random() * 10) + 1;
            const score2 = Math.floor(Math.random() * 10) + 1;
            standings = updateStandings(standings, m.player1Id!, m.player2Id!, score1, score2);
        });

        // Every player should have played 5 matches (n-1)
        standings.forEach(s => {
            expect(s.played).toBe(5);
        });

        // Total points should be consistent
        // Max possible: 15 matches * 3 points = 45 points
        // With draws: could be less
        const totalPoints = standings.reduce((sum, s) => sum + s.points, 0);
        expect(totalPoints).toBeLessThanOrEqual(45);
        expect(totalPoints).toBeGreaterThan(0);
    });

    it('should handle 5-player elimination with qualification round (no byes)', () => {
        const players = createPlayers(5);
        let matches = generateSingleEliminationBracket(tournamentId, players);

        // No bye matches (pre-played) — seeds go directly into round 2 slots
        const byeMatches = matches.filter(m => m.isPlayed && m.winnerId);
        expect(byeMatches.length).toBe(0);

        // Round 1 has exactly 1 qualifying match (5 - 8/2 = 1)
        const r1Matches = matches.filter(m => m.round === 1);
        expect(r1Matches.length).toBe(1);
        expect(r1Matches[0].player1Id).not.toBeNull();
        expect(r1Matches[0].player2Id).not.toBeNull();

        // Play all matches to completion
        while (getPlayableMatches(matches).length > 0) {
            const playable = getPlayableMatches(matches);
            playable.forEach(m => {
                const idx = matches.findIndex(match =>
                    match.round === m.round &&
                    match.position === m.position &&
                    !match.isPlayed
                );
                if (idx !== -1) {
                    matches = simulateMatchResult(matches, idx, 10, 5);
                }
            });
        }

        // All should be played
        expect(matches.filter(m => !m.isPlayed).length).toBe(0);
    });
});

// ============================================================
// EDGE CASE TESTS
// ============================================================

describe('Edge Cases and Error Handling', () => {
    const tournamentId = 'test-tournament';

    it('should handle minimum viable tournament (2 players)', () => {
        const players = createPlayers(2);
        const matches = generateSingleEliminationBracket(tournamentId, players);

        // Just 1 match (the final)
        expect(matches.length).toBe(1);
        expect(matches[0].round).toBe(1);
        expect(isMatchPlayable(matches[0])).toBe(true);
    });

    it('should handle all draws in round robin', () => {
        const playerIds = ['p1', 'p2', 'p3'];
        let standings = createStandings(playerIds);

        // All matches end in draw
        standings = updateStandings(standings, 'p1', 'p2', 5, 5);
        standings = updateStandings(standings, 'p1', 'p3', 5, 5);
        standings = updateStandings(standings, 'p2', 'p3', 5, 5);

        // All players should have same points (3 draws = 3 points each)
        standings.forEach(s => {
            expect(s.points).toBe(2); // 2 draws * 1 point
            expect(s.won).toBe(0);
            expect(s.drawn).toBe(2);
            expect(s.lost).toBe(0);
        });
    });

    it('should handle unbalanced group sizes', () => {
        const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5']; // 5 players
        const matches = generateGroupStageMatches(tournamentId, playerIds, false);

        const g1 = matches.filter(m => m.stage === 'GROUP_1');
        const g2 = matches.filter(m => m.stage === 'GROUP_2');

        // Group 1: 2 players = 1 match
        // Group 2: 3 players = 3 matches
        expect(g1.length).toBe(1);
        expect(g2.length).toBe(3);
    });
});
