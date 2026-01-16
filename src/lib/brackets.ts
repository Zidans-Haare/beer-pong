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

    // Handle edge case: 0 or 1 player
    if (numPlayers === 0) {
        return [];
    }

    // Find next power of 2
    let size = 2;
    while (size < numPlayers) size *= 2;

    const matches: MatchInput[] = [];
    const rounds = Math.ceil(Math.log2(size));

    // Round 1 matches - use proper bracket seeding with byes
    // Standard tournament bracket: pair position i with position (size-1-i)
    // This ensures byes are distributed correctly
    const r1MatchesCount = size / 2;

    // Create slots array with players and nulls (for byes)
    // Fill top seeds first, byes go to bottom positions
    const slots: (typeof players[0] | null)[] = new Array(size).fill(null);
    for (let i = 0; i < numPlayers; i++) {
        slots[i] = shuffled[i];
    }

    for (let m = 0; m < r1MatchesCount; m++) {
        // Standard bracket pairing: match m pairs slot m with slot (size - 1 - m)
        // This distributes byes to face higher seeds
        const slot1 = m;
        const slot2 = size - 1 - m;
        const p1 = slots[slot1];
        const p2 = slots[slot2];

        const isBye = (p1 && !p2) || (!p1 && p2);
        const byeWinner = p1 || p2;

        matches.push({
            tournamentId,
            round: 1,
            position: m,
            stage: 'BRACKET',
            player1Id: p1?.id || null,
            player2Id: p2?.id || null,
            isPlayed: isBye ? true : false,
            winnerId: isBye ? byeWinner?.id || null : null
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

    // Auto-advance bye winners through the bracket
    // Process bye matches and propagate winners to next rounds
    let hasChanges = true;
    while (hasChanges) {
        hasChanges = false;

        for (const match of matches) {
            // Skip if not played or no winner
            if (!match.isPlayed || !match.winnerId) continue;
            // Skip 3rd place match (position 1 in final round)
            if (match.round === rounds && match.position === 1) continue;
            // Skip final (position 0 in final round) - no next match
            if (match.round === rounds && match.position === 0) continue;

            // Calculate next match
            const nextRound = match.round + 1;
            const nextPosition = Math.floor(match.position / 2);
            const isPlayer1InNext = match.position % 2 === 0;

            // Find next match
            const nextMatch = matches.find(m =>
                m.round === nextRound && m.position === nextPosition
            );

            if (!nextMatch) continue;

            // Place winner in correct slot if not already there
            const slot = isPlayer1InNext ? 'player1Id' : 'player2Id';
            if (nextMatch[slot] !== match.winnerId) {
                nextMatch[slot] = match.winnerId;

                // Check if next match is now a bye (one player, other slot empty from another bye)
                const otherSlot = isPlayer1InNext ? 'player2Id' : 'player1Id';
                if (nextMatch[slot] && !nextMatch[otherSlot]) {
                    // This is a bye - the opponent slot is permanently empty
                    // Check if the opponent match is also a bye (all bye winners)
                    const otherMatchPosition = isPlayer1InNext
                        ? match.position + 1  // If we're player1, opponent comes from position+1
                        : match.position - 1; // If we're player2, opponent comes from position-1
                    const otherMatch = matches.find(m =>
                        m.round === match.round && m.position === otherMatchPosition
                    );

                    // If opponent match is also a bye (already played), mark this as bye
                    if (otherMatch && otherMatch.isPlayed && otherMatch.winnerId) {
                        // Both feeder matches are byes, so fill the other slot
                        nextMatch[otherSlot] = otherMatch.winnerId;
                    }
                }

                // Check if next match is now complete (both slots filled from byes)
                // or if it's a bye (one slot filled, other permanently null)
                if (nextMatch.player1Id && nextMatch.player2Id) {
                    // Both slots filled - match is ready to play (not a bye)
                    // Don't mark as played
                } else if (nextMatch.player1Id || nextMatch.player2Id) {
                    // Check if the empty slot will ever be filled
                    // If the feeder match for that slot is a bye with no winner, this becomes a bye
                    const filledSlot = nextMatch.player1Id ? 'player1Id' : 'player2Id';
                    const emptySlotIsPlayer1 = !nextMatch.player1Id;
                    const feederPosition = emptySlotIsPlayer1
                        ? nextPosition * 2      // player1 comes from even position
                        : nextPosition * 2 + 1; // player2 comes from odd position
                    const feederMatch = matches.find(m =>
                        m.round === nextRound - 1 && m.position === feederPosition
                    );

                    // If feeder match has no players (impossible match), this is a bye
                    if (feederMatch && !feederMatch.player1Id && !feederMatch.player2Id) {
                        nextMatch.isPlayed = true;
                        nextMatch.winnerId = nextMatch[filledSlot] || null;
                        hasChanges = true;
                    }
                }
            }
        }
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
