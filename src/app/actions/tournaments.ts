'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { generateSingleEliminationBracket, generateRoundRobinMatches, generateGroupStageMatches } from '@/lib/brackets';
import { auth } from '@/auth';
import { broadcastNotification } from './notifications';


export async function getTournaments() {
    try {
        const tournaments = await prisma.tournament.findMany({
            orderBy: { date: 'asc' },
        });
        return tournaments;
    } catch (error) {
        console.error('Failed to fetch tournaments:', error);
        throw new Error('Failed to fetch tournaments');
    }
}

export async function createTournament(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    const name = formData.get('name') as string;
    const dateStr = formData.get('date') as string;
    const location = formData.get('location') as string;
    const type = formData.get('type') as string;
    const hasReturnLeg = formData.get('hasReturnLeg') === 'on';
    const startImmediately = formData.get('startImmediately') === 'on';

    // We no longer use manual participant selection in the form
    // const participantIds = formData.getAll('participants') as string[];
    const participantIds: string[] = [];

    const userId = session.user.id;

    if (!name || (!startImmediately && !dateStr) || !location) {
        throw new Error('Missing required fields');
    }

    // If starting now, use current date
    const date = startImmediately ? new Date() : new Date(dateStr);

    // Fetch Host Player ID
    const hostPlayer = await prisma.player.findUnique({
        where: { userId: session.user.id }
    });

    if (hostPlayer && !participantIds.includes(hostPlayer.id)) {
        participantIds.push(hostPlayer.id);
    }

    // Fetch System Defaults
    const settings = await (prisma as any).systemSettings.findUnique({ where: { id: 'default' } });
    const matchDurationMin = settings?.matchDurationMin || 15;
    const tableCount = settings?.tableCount || 1;

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            const tournament = await tx.tournament.create({
                data: {
                    name,
                    date,
                    location,
                    type: type || 'ELIMINATION',
                    status: 'PLANNED', // Even "Now" starts as PLANNED (Lobby)
                    hostId: userId,
                    hasReturnLeg,
                    matchDurationMin,
                    tableCount
                },
            });

            // Add host as YES RSVP
            if (hostPlayer) {
                await tx.rSVP.create({
                    data: {
                        tournamentId: tournament.id,
                        playerId: hostPlayer.id,
                        status: 'YES'
                    }
                });
            }

            return tournament;
        });

        revalidatePath('/tournaments');

        if (startImmediately) {
            // Immediate Broadcast for "Now" tournaments
            await broadcastNotification({
                title: '🏆 Neues Turnier!',
                message: `${name} startet JETZT! Join die Lobby!`,
                link: `/tournaments/${result.id}`,
                type: 'TOURNAMENT'
            });
            return { success: true, redirectUrl: `/tournaments/${result.id}` };
        }

        // For planned tournaments, we might want to return all emails for the sharing dialog
        const allPlayers = await prisma.player.findMany({
            select: {
                email: true,
                user: { select: { email: true } }
            }
        });
        const participantEmails = allPlayers.map((p: any) => p.email || p.user?.email).filter(Boolean) as string[];

        return { success: true, tournament: result, participantEmails };
    } catch (error) {
        console.error('Failed to create tournament:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create tournament' };
    }
}

export async function startTournament(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });

        if (!tournament) throw new Error('Tournament not found');

        if (tournament.hostId && tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann das Turnier starten.' };
        }

        if (tournament.status !== 'PLANNED') throw new Error('Tournament already started or completed');

        // Use the new Service
        const { TournamentService } = await import('@/lib/services/TournamentService');
        await TournamentService.startTournament(tournamentId);

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to start tournament:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to start tournament' };
    }
}

export async function startPlayoffs(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { matches: true }
        });

        if (!tournament || (tournament.type !== 'ROUND_ROBIN' && tournament.type !== 'GROUPS' && tournament.type !== 'GROUP_AND_KNOCKOUT')) {
            throw new Error('Dieses Turnier unterstützt keine Playoffs.');
        }

        if (tournament.hostId && tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann Playoffs starten.' };
        }

        // Check if groups are actually done
        const unplayed = tournament.matches.filter((m: any) =>
            (m.stage === 'GROUP' || m.stage === 'GROUP_1' || m.stage === 'GROUP_2') && !m.isPlayed
        );
        if (unplayed.length > 0) throw new Error('Alle Gruppenspiele müssen beendet sein.');

        // Use the new Service
        const { TournamentService } = await import('@/lib/services/TournamentService');
        await TournamentService.generateKnockoutFromGroups(tournamentId);

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to start playoffs:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Fehler beim Starten der Playoffs' };
    }
}

export async function deleteTournament(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Nicht eingeloggt' };

    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
        if (!tournament) return { success: false, error: 'Turnier nicht gefunden' };

        if (tournament.hostId && tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann das Turnier löschen.' };
        }

        await prisma.$transaction(async (tx: any) => {
            await tx.match.deleteMany({ where: { tournamentId } });
            await tx.rSVP.deleteMany({ where: { tournamentId } });
            await tx.tournament.delete({ where: { id: tournamentId } });
        });

        revalidatePath('/tournaments');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete tournament:', error);
        return { success: false, error: 'Turnier konnte nicht gelöscht werden' };
    }
}

export async function finishTournament(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
        if (tournament?.hostId && tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann das Turnier beenden.' };
        }

        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: 'COMPLETED' }
        });

        // Broadcast completion
        await broadcastNotification({
            title: 'Turnier beendet',
            message: `"${tournament?.name}" ist vorbei! Klicke hier für die Ergebnisse.`,
            link: `/tournaments/${tournamentId}`,
            type: 'TOURNAMENT'
        });

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Fehler beim Abschließen' };
    }
}
