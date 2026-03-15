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
                player2: true,
                team1: true,
                team2: true,
            }
        });

        if (!match) throw new Error('Match not found');

        const isTeamMatch = !!match.team1Id && !!match.team2Id;

        // Validation: Both players/teams must be assigned (no TBD matches)
        if (isTeamMatch) {
            if (!match.team1Id || !match.team2Id) {
                return { success: false, error: 'Dieses Match kann noch nicht gespielt werden. Warte auf die Qualifikation beider Teams.' };
            }
        } else {
            if (!match.player1Id || !match.player2Id) {
                return { success: false, error: 'Dieses Match kann noch nicht gespielt werden. Warte auf die Qualifikation beider Spieler.' };
            }
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
