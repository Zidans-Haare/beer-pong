'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateMatchResult(matchId: string, score1: number, score2: number) {
    try {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { tournament: true } // Need tournament ID for revalidation
        });

        if (!match) throw new Error('Match not found');

        const winnerId = score1 > score2 ? match.player1Id : (score2 > score1 ? match.player2Id : null);

        // Update current match
        await prisma.match.update({
            where: { id: matchId },
            data: {
                score1,
                score2,
                winnerId
            }
        });

        // Advance winner to next round if applicable (Simple logic)
        if (winnerId && match.stage === 'BRACKET') {
            // Calculate next match position
            // Round 1, Pos 0 & 1 -> Round 2, Pos 0
            // Round 1, Pos 2 & 3 -> Round 2, Pos 1
            const nextRound = match.round + 1;
            const nextPosition = Math.floor(match.position / 2);
            const isPlayer1InNext = match.position % 2 === 0;

            // Check if next match exists
            const nextMatch = await prisma.match.findFirst({
                where: {
                    tournamentId: match.tournamentId,
                    round: nextRound,
                    position: nextPosition
                }
            });

            if (nextMatch) {
                const updateData = isPlayer1InNext ? { player1Id: winnerId } : { player2Id: winnerId };
                await prisma.match.update({
                    where: { id: nextMatch.id },
                    data: updateData
                });
            }
        }

        revalidatePath(`/tournaments/${match.tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to update match:', error);
        return { success: false, error: 'Failed to update match' };
    }
}
