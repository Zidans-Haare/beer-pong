import { Player } from '@prisma/client';

export interface MatchInput {
    tournamentId: string;
    round: number;
    position: number;
    player1Id?: string | null;
    player2Id?: string | null;
    stage: 'BRACKET' | 'GROUP';
}

/**
 * Modern Fisher-Yates shuffle for true randomness
 */
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

export function generateSingleEliminationBracket(tournamentId: string, players: Player[]): MatchInput[] {
    // 1. Shuffle players for random seeding
    const shuffled = shuffleArray(players);

    const numPlayers = shuffled.length;
    // Next power of 2
    let size = 2;
    while (size < numPlayers) size *= 2;

    const matches: MatchInput[] = [];
    const rounds = Math.log2(size); // e.g. 8 players -> 3 rounds (Q, S, F)

    // Generate main bracket structure
    for (let r = 1; r <= rounds; r++) {
        const matchesInRound = size / Math.pow(2, r);
        for (let m = 0; m < matchesInRound; m++) {
            // Round 1 population from shuffled list
            let p1Id: string | null = null;
            let p2Id: string | null = null;

            if (r === 1) {
                // Populate starting matches
                // For proper seeding, we pair 0 vs N, 1 vs N-1 etc. But random here is fine.
                // Simple fill:
                p1Id = shuffled.pop()?.id || null;
                p2Id = shuffled.pop()?.id || null;
            }

            matches.push({
                tournamentId,
                round: r,
                position: m,
                stage: 'BRACKET',
                player1Id: p1Id,
                player2Id: p2Id,
            });
        }
    }

    // Add Third Place Match if it's an elimination tournament
    // Typically round = rounds (Final is 'rounds'), so 3rd place can be 'rounds' + 1 conceptually or same round but different id?
    // Let's use round = rounds (same as Final) but position = 1 if Final is position 0.
    // Standard Single Elim: Final is Round N, Match 0. 
    // We can add 3rd place match as Round N, Match 1 (which doesn't exist normally).
    // Or distinct stage? Let's keep stage BRACKET but use special position logic or round.
    // Common convention: It happens parallel to finals.
    if (rounds > 1) {
        matches.push({
            tournamentId,
            round: rounds, // Same round as final
            position: 1,   // Final is 0, 3rd place is 1
            stage: 'BRACKET',
            player1Id: null, // Will apply losers from Semis
            player2Id: null,
        });
    }

    return matches;
}

export function generateRoundRobinMatches(tournamentId: string, players: Player[]): MatchInput[] {
    // 1. Shuffle players for random order in list (affects pairing sequence/home-away)
    const p = shuffleArray(players);
    const n = p.length;
    const matches: MatchInput[] = [];

    // Berger Table algorithm for Round Robin
    // If odd number of players, add a dummy bye player
    const people = [...p];
    if (n % 2 !== 0) {
        people.push({ id: 'BYE' } as any); // Dummy
    }

    const numTeams = people.length;
    const numRounds = numTeams - 1;
    const halfSize = numTeams / 2;

    const teams = [...people];
    // Teams[0] is fixed, others rotate

    for (let round = 0; round < numRounds; round++) {
        for (let i = 0; i < halfSize; i++) {
            const team1 = teams[i];
            const team2 = teams[numTeams - 1 - i];

            if (team1.id !== 'BYE' && team2.id !== 'BYE') {
                matches.push({
                    tournamentId,
                    round: round + 1,
                    position: matches.length, // Global counter for ordering
                    stage: 'GROUP', // Use GROUP for Round Robin
                    player1Id: team1.id,
                    player2Id: team2.id,
                });
            }
        }
        // Rotate teams array, keeping index 0 fixed
        // [0, 1, 2, 3] -> [0, 3, 1, 2]
        const last = teams.pop();
        if (last) teams.splice(1, 0, last);
    }

    return matches;
}
