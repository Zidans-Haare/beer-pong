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
        const isPlayer1 = match.player1?.userId === session.user.id;
        const isPlayer2 = match.player2?.userId === session.user.id;

        if (!isHost && !isPlayer1 && !isPlayer2) {
            return { success: false, error: 'Nur beteiligte Spieler oder der Host dürfen Ergebnisse eintragen.' };
        }

        // Use MatchService
        const { MatchService } = await import('@/lib/services/MatchService');
        await MatchService.updateMatch(matchId, score1, score2);

        revalidatePath(`/tournaments/${match.tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to update match:', error);
        return { success: false, error: 'Failed to update match' };
    }
}
