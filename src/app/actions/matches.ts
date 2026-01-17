'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { isUserInTeam } from '@/lib/teams';

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
                team1: {
                    include: {
                        player1: { select: { userId: true } },
                        player2: { select: { userId: true } }
                    }
                },
                team2: {
                    include: {
                        player1: { select: { userId: true } },
                        player2: { select: { userId: true } }
                    }
                }
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

        // Permission Check:
        // 1. Host of the tournament
        const isHost = match.tournament.hostId === session.user.id;

        // 2. Player/Team involved in the match
        let isAuthorized = isHost;

        if (isTeamMatch) {
            // For team matches: check if user is member of team1 or team2
            const isInTeam1 = match.team1 ? await isUserInTeam(session.user.id, match.team1.id) : false;
            const isInTeam2 = match.team2 ? await isUserInTeam(session.user.id, match.team2.id) : false;
            isAuthorized = isAuthorized || isInTeam1 || isInTeam2;
        } else {
            // For solo matches: check if user is player1 or player2
            const isPlayer1 = match.player1?.userId === session.user.id;
            const isPlayer2 = match.player2?.userId === session.user.id;
            isAuthorized = isAuthorized || isPlayer1 || isPlayer2;
        }

        console.log(`[UpdateMatch] Match ${matchId}, User ${session.user.id}, TeamMatch: ${isTeamMatch}`);

        if (!isAuthorized) {
            return { success: false, error: 'Nur beteiligte Spieler/Teams oder der Host dürfen Ergebnisse eintragen.' };
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
