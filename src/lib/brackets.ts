// import { Player } from '@prisma/client'; 
// Using basic types for now or string/any to bypass non-exported member error
// The main logic just uses string IDs.

export interface MatchInput {
    tournamentId: string;
    round: number;
    position: number;
    player1Id?: string | null;
    player2Id?: string | null;
    stage: 'BRACKET' | 'GROUP' | 'GROUP_1' | 'GROUP_2';
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

// function generateSingleEliminationBracket(tournamentId: string, players: { id: string }[]): MatchInput[] {
export function generateSingleEliminationBracket(tournamentId: string, players: any[]): MatchInput[] {
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

export function generateRoundRobinMatches(tournamentId: string, playerIds: string[]): MatchInput[] {
    // 1. Shuffle players
    const shuffledPlayers = shuffleArray(playerIds);

    // 2. Split into 2 groups
    const mid = Math.ceil(shuffledPlayers.length / 2);
    const group1 = shuffledPlayers.slice(0, mid);
    const group2 = shuffledPlayers.slice(mid);

    const matches: MatchInput[] = [];

    // Helper to generate matches for a single group
    const generateGroupMatches = (groupPlayers: string[], groupName: 'GROUP_1' | 'GROUP_2', startPosition: number): MatchInput[] => {
        const n = groupPlayers.length;
        const isOdd = n % 2 !== 0;
        // If odd, add a dummy player for bye rounds (internal logic only)
        const players = isOdd ? [...groupPlayers, null] : groupPlayers;
        const numMetPlayers = players.length;
        const numRounds = numMetPlayers - 1;
        const half = numMetPlayers / 2;

        const groupMatches: MatchInput[] = [];

        // Berger tables algorithm
        // Fixed position for the last player, rotate others

        const rotatingPlayers = players.slice(0, numMetPlayers - 1);
        const lastPlayer = players[numMetPlayers - 1];

        for (let round = 0; round < numRounds; round++) {
            const roundMatches: { p1: string | null; p2: string | null }[] = [];

            // Pair with fixed player
            const p1 = rotatingPlayers[0];
            const p2 = lastPlayer;
            if (p1 && p2) roundMatches.push({ p1: p1 as string, p2: p2 as string });

            // Pair others
            for (let i = 1; i < half; i++) {
                const a = rotatingPlayers[i];
                const b = rotatingPlayers[rotatingPlayers.length - i];
                if (a && b) roundMatches.push({ p1: a as string, p2: b as string });
            }

            // Add to main list
            roundMatches.forEach((m, idx) => {
                groupMatches.push({
                    tournamentId,
                    player1Id: m.p1,
                    player2Id: m.p2,
                    round: round + 1,
                    position: startPosition + (round * half) + idx, // Just a unique counter
                    stage: groupName
                });
            });

            // Rotate: check standard algo: move last element of rotating set to the front. 
            const lastRot = rotatingPlayers.pop();
            if (lastRot) rotatingPlayers.unshift(lastRot);
        }
        return groupMatches;
    };

    const matchesG1 = generateGroupMatches(group1, 'GROUP_1', 100); // Start IDs at 100
    const matchesG2 = generateGroupMatches(group2, 'GROUP_2', 200); // Start IDs at 200

    return [...matchesG1, ...matchesG2];
}
