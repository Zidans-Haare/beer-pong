'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';

export async function updateMatchResult(matchId: string, score1: number, score2: number) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                tournament: true,
                player1: true,
                player2: true
            }
        });

        if (!match) throw new Error('Match not found');

        // Permission Check:
        // 1. Host of the tournament
        const isHost = match.tournament.hostId === session.user.id;

        // 2. Player involved in the match
        // We need to check if session.user.id is linked to player1 or player2
        // Our schema has Player.userId. 
        // We didn't include Player.userId in the query above.
        // But match.player1 has 'userId' field? Yes if we select it or if it's on model.
        // Actually, match.player1 is the Player object.
        const isPlayer1 = match.player1?.userId === session.user.id;
        const isPlayer2 = match.player2?.userId === session.user.id;

        if (!isHost && !isPlayer1 && !isPlayer2) {
            return { success: false, error: 'Nur beteiligte Spieler oder der Host dürfen Ergebnisse eintragen.' };
        }

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
