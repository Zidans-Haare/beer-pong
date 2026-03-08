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

    if (numPlayers === 0) return [];

    // Find next power of 2
    let size = 2;
    while (size < numPlayers) size *= 2;

    // Edge case: exactly 2 players → one final match, no byes
    if (size === 2) {
        return [{
            tournamentId, round: 1, position: 0, stage: 'BRACKET',
            player1Id: shuffled[0]?.id || null,
            player2Id: shuffled[1]?.id || null,
            isPlayed: false
        }];
    }

    const matches: MatchInput[] = [];
    const rounds = Math.ceil(Math.log2(size));

    // byeCount: how many top seeds skip round 1 entirely
    // qualMatchCount: actual round-1 matches that need to be played
    const byeCount = size - numPlayers;
    const qualMatchCount = numPlayers - size / 2; // = (2*numPlayers - size) / 2
    const r2Count = size / 4; // number of round-2 match slots

    // Seeds get a direct bye to round 2; qualifying players fill round 1
    const seeds = shuffled.slice(0, byeCount);
    const qualPlayers = shuffled.slice(byeCount); // length = 2 * qualMatchCount

    // Determine r1 position for each qual match so seeds and qual-winners interleave
    // in round 2 (each qual match advances to a different r2 position where possible).
    // First r2Count qual matches → r1 even positions (→ r2 as player1).
    // Remaining qual matches   → r1 odd positions  (→ r2 as player2, filling remaining slots).
    const qualR1Positions: number[] = [];
    for (let q = 0; q < qualMatchCount; q++) {
        const r1Pos = q < r2Count
            ? 2 * q                    // even → r2 pos q, player1
            : 2 * (q - r2Count) + 1;   // odd  → r2 pos (q-r2Count), player2
        qualR1Positions.push(r1Pos);
    }

    // Round 1: qualifying matches only (no byes)
    for (let q = 0; q < qualMatchCount; q++) {
        matches.push({
            tournamentId,
            round: 1,
            position: qualR1Positions[q],
            stage: 'BRACKET',
            player1Id: qualPlayers[q]?.id || null,
            player2Id: qualPlayers[2 * qualMatchCount - 1 - q]?.id || null,
            isPlayed: false,
        });
    }

    // Mark which r2 slots will receive a qual winner via advanceWinner
    const coveredR2Slots = new Set<string>();
    for (let q = 0; q < qualMatchCount; q++) {
        const p = qualR1Positions[q];
        coveredR2Slots.add(`${Math.floor(p / 2)}-${p % 2 === 0 ? 'p1' : 'p2'}`);
    }

    // Round 2: pre-fill seeds into slots not covered by qual matches
    let seedIdx = 0;
    for (let m = 0; m < r2Count; m++) {
        const p1Covered = coveredR2Slots.has(`${m}-p1`);
        const p2Covered = coveredR2Slots.has(`${m}-p2`);
        matches.push({
            tournamentId,
            round: 2,
            position: m,
            stage: 'BRACKET',
            player1Id: p1Covered ? null : (seeds[seedIdx++]?.id || null),
            player2Id: p2Covered ? null : (seeds[seedIdx++]?.id || null),
            isPlayed: false,
        });
    }

    // Rounds 3 and beyond: empty placeholders
    for (let r = 3; r <= rounds; r++) {
        const matchesInRound = size / Math.pow(2, r);
        for (let m = 0; m < matchesInRound; m++) {
            matches.push({
                tournamentId,
                round: r,
                position: m,
                stage: 'BRACKET',
                player1Id: null,
                player2Id: null,
                isPlayed: false,
            });
        }
    }

    // Third place match (position 1 in the final round)
    if (rounds > 1) {
        matches.push({
            tournamentId,
            round: rounds,
            position: 1,
            stage: 'BRACKET',
            player1Id: null,
            player2Id: null,
            isPlayed: false,
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
