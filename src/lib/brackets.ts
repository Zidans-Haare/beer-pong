// import { Player } from '@prisma/client'; 
// Using basic types for now or string/any to bypass non-exported member error
// The main logic just uses string IDs.

export interface MatchInput {
    tournamentId: string;
    round: number;
    position: number;
    player1Id?: string | null;
    player2Id?: string | null;
    stage: 'BRACKET' | 'GROUP' | 'GROUP_1' | 'GROUP_2' | 'LEAGUE';
    isPlayed?: boolean;
    winnerId?: string | null;
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
    const shuffled = shuffleArray(players);
    const numPlayers = shuffled.length;

    // Find next power of 2
    let size = 2;
    while (size < numPlayers) size *= 2;

    const matches: MatchInput[] = [];
    const rounds = Math.ceil(Math.log2(size));

    // Round 1 matches
    const r1MatchesCount = size / 2;
    for (let m = 0; m < r1MatchesCount; m++) {
        const p1 = shuffled[m * 2] || null;
        const p2 = shuffled[m * 2 + 1] || null;

        const isBye = p1 && !p2;

        matches.push({
            tournamentId,
            round: 1,
            position: m,
            stage: 'BRACKET',
            player1Id: p1?.id || null,
            player2Id: p2?.id || null,
            isPlayed: isBye ? true : false,
            winnerId: isBye ? p1.id : null
        });
    }

    // Future Rounds (Placeholders)
    for (let r = 2; r <= rounds; r++) {
        const matchesInRound = size / Math.pow(2, r);
        for (let m = 0; m < matchesInRound; m++) {
            matches.push({
                tournamentId,
                round: r,
                position: m,
                stage: 'BRACKET',
                player1Id: null,
                player2Id: null,
                isPlayed: false
            });
        }
    }

    // Add Third Place Match
    if (rounds > 1) {
        matches.push({
            tournamentId,
            round: rounds,
            position: 1,   // Final is 0, 3rd place 1
            stage: 'BRACKET',
            player1Id: null,
            player2Id: null,
            isPlayed: false
        });
    }

    return matches;
}

// Helper for Berger Table generation (Round Robin logic)
function generateBergerMatches(playerIds: string[], tournamentId: string, stage: 'GROUP' | 'GROUP_1' | 'GROUP_2' | 'BRACKET' | 'LEAGUE', startPosition: number, hasReturnLeg: boolean = false): MatchInput[] {
    const n = playerIds.length;
    const isOdd = n % 2 !== 0;
    const players = isOdd ? [...playerIds, null] : playerIds;
    const numMetPlayers = players.length;
    const numRounds = numMetPlayers - 1;
    const half = numMetPlayers / 2;

    const matches: MatchInput[] = [];
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

        // Add to list
        roundMatches.forEach((m, idx) => {
            const pos = startPosition + (round * half) + idx;
            matches.push({
                tournamentId,
                player1Id: m.p1,
                player2Id: m.p2,
                round: round + 1,
                position: pos,
                stage: stage,
                isPlayed: false
            });

            if (hasReturnLeg) {
                // Return leg: Use a large offset to avoid collisions
                // Offset = 100000 + startPosition offset ensures uniqueness
                const returnLegPosition = 100000 + startPosition + (round * half) + idx;
                matches.push({
                    tournamentId,
                    player1Id: m.p2,
                    player2Id: m.p1,
                    round: round + 1 + numRounds,
                    position: returnLegPosition,
                    stage: stage,
                    isPlayed: false
                });
            }
        });

        // Rotate
        const lastRot = rotatingPlayers.pop();
        if (lastRot) rotatingPlayers.unshift(lastRot);
    }
    return matches;
}

export function generateRoundRobinMatches(tournamentId: string, playerIds: string[], hasReturnLeg: boolean = false): MatchInput[] {
    const shuffled = shuffleArray(playerIds);
    return generateBergerMatches(shuffled, tournamentId, 'LEAGUE', 0, hasReturnLeg);
}

export function generateGroupStageMatches(tournamentId: string, playerIds: string[], hasReturnLeg: boolean = false): MatchInput[] {
    const shuffledPlayers = shuffleArray(playerIds);

    // Balanced group split: distribute players as evenly as possible
    // For odd numbers, the first group gets one less player
    const mid = Math.floor(shuffledPlayers.length / 2);
    const group1 = shuffledPlayers.slice(0, mid);
    const group2 = shuffledPlayers.slice(mid);

    // Use larger position offsets to avoid collisions with return legs
    const matchesG1 = generateBergerMatches(group1, tournamentId, 'GROUP_1', 10000, hasReturnLeg);
    const matchesG2 = generateBergerMatches(group2, tournamentId, 'GROUP_2', 20000, hasReturnLeg);

    return [...matchesG1, ...matchesG2];
}
