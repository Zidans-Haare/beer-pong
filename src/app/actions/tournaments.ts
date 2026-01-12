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
    const startImmediately = formData.get('startImmediately') === 'on';
    const participantIds = formData.getAll('participants') as string[];

    const userId = session.user.id;

    if (!name || !dateStr || !location) {
        throw new Error('Missing required fields');
    }

    const date = new Date(dateStr);

    // Fetch Host Player ID
    const hostPlayer = await prisma.player.findUnique({
        where: { userId: session.user.id }
    });

    if (hostPlayer && !participantIds.includes(hostPlayer.id)) {
        participantIds.push(hostPlayer.id);
    }

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            const tournament = await tx.tournament.create({
                data: {
                    name,
                    date,
                    location,
                    type: type || 'ELIMINATION',
                    status: startImmediately ? 'ACTIVE' : 'PLANNED',
                    hostId: userId,
                },
            });

            if (participantIds.length > 0) {
                for (const playerId of participantIds) {
                    await tx.rSVP.create({
                        data: {
                            tournamentId: tournament.id,
                            playerId,
                            status: 'YES'
                        }
                    });
                }
            }

            if (startImmediately) {
                if (participantIds.length < 2) throw new Error('Für Sofort-Start werden mind. 2 Spieler benötigt.');

                const players = await tx.player.findMany({
                    where: { id: { in: participantIds } }
                });

                let matches;
                if (type === 'ROUND_ROBIN') {
                    const playerIds = players.map((p: any) => p.id);
                    matches = generateRoundRobinMatches(tournament.id, playerIds);
                } else if (type === 'GROUPS') {
                    if (players.length < 4) throw new Error('Für Gruppenphase werden mind. 4 Spieler benötigt.');
                    const playerIds = players.map((p: any) => p.id);
                    matches = generateGroupStageMatches(tournament.id, playerIds);
                } else {
                    matches = generateSingleEliminationBracket(tournament.id, players);
                }

                for (const match of matches) {
                    await tx.match.create({ data: match });
                }
            }

            return tournament;
        });

        revalidatePath('/tournaments');

        // Fetch ALL player emails for the invitation link, regardless of who was selected as participant
        const allPlayers = await prisma.player.findMany({
            select: {
                email: true,
                user: { select: { email: true } }
            }
        });
        const participantEmails = allPlayers.map((p: any) => p.email || p.user?.email).filter(Boolean) as string[];

        console.log('Mapped all emails:', participantEmails);

        if (result.status === 'ACTIVE') {
            return { success: true, redirectUrl: `/tournaments/${result.id}` };
        }


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

        // Verify min players
        const playersCount = await prisma.rSVP.count({
            where: { tournamentId, status: "YES" } // Assuming we only count YES RSVPs? Logic was implicit before.
        });

        // NOTE: The previous logic mapped RSVPs manually.
        const tournamentWithRsvps = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { rsvps: { include: { player: true } } }
        });
        const players = tournamentWithRsvps?.rsvps.map(r => r.player) || [];

        if (players.length < 2) throw new Error('Not enough players (min 2)');

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
            include: { matches: true, rsvps: { include: { player: true } } }
        });

        if (!tournament || (tournament.type !== 'ROUND_ROBIN' && tournament.type !== 'GROUPS')) throw new Error('Invalid tournament type for these playoffs');
        if (tournament.hostId && tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann Playoffs starten.' };
        }

        const { getTournamentStandings } = await import('@/lib/stats');

        if (tournament.type === 'ROUND_ROBIN') {
            // Classic Round Robin: Check if all matches done
            const unplayed = tournament.matches.filter((m: any) => m.stage === 'GROUP' && !m.winnerId);
            if (unplayed.length > 0) throw new Error('Alle Spiele müssen beendet sein.');

            // Create Final Match between #1 and #2?
            const standings = await getTournamentStandings(tournamentId);
            if (standings.length < 2) throw new Error('Nicht genügend Spieler für Finale.');

            const p1 = standings[0].playerId;
            const p2 = standings[1].playerId;

            await prisma.match.create({
                data: {
                    tournamentId,
                    round: 99, // Final
                    position: 0,
                    stage: 'BRACKET', // It's a bracket match now
                    player1Id: p1,
                    player2Id: p2
                }
            });

        } else if (tournament.type === 'GROUPS') {
            // Check for loose matches (any match in GROUP stage without winner)
            const unplayed = tournament.matches.filter((m: any) => (m.stage === 'GROUP_1' || m.stage === 'GROUP_2') && !m.winnerId);
            if (unplayed.length > 0) throw new Error('Alle Gruppenspiele müssen beendet sein.');

            // Fetch standings per group
            const standingsG1 = await getTournamentStandings(tournamentId, 'GROUP_1');
            const standingsG2 = await getTournamentStandings(tournamentId, 'GROUP_2');

            if (standingsG1.length < 2 || standingsG2.length < 2) {
                throw new Error('Jede Gruppe benötigt mindestens 2 Spieler für die Halbfinals.');
            }

            const g1First = standingsG1[0].playerId;
            const g1Second = standingsG1[1].playerId;
            const g2First = standingsG2[0].playerId;
            const g2Second = standingsG2[1].playerId;

            await prisma.$transaction(async (tx: any) => {
                // Semifinal 1: G1#1 vs G2#2
                await tx.match.create({
                    data: {
                        tournamentId,
                        round: 98, // Semifinals
                        position: 0,
                        stage: 'BRACKET', // Playoff stage
                        player1Id: g1First,
                        player2Id: g2Second
                    }
                });

                // Semifinal 2: G2#1 vs G1#2
                await tx.match.create({
                    data: {
                        tournamentId,
                        round: 98,
                        position: 1,
                        stage: 'BRACKET',
                        player1Id: g2First,
                        player2Id: g1Second
                    }
                });

                // Final: Winner Semi 1 vs Winner Semi 2
                // Created empty so winners can be advanced automatically
                await tx.match.create({
                    data: {
                        tournamentId,
                        round: 99,
                        position: 0,
                        stage: 'BRACKET',
                        player1Id: null,
                        player2Id: null
                    }
                });
            });
        }

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to start playoffs:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error' };
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
