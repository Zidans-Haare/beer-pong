'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { generateSingleEliminationBracket, generateRoundRobinMatches } from '@/lib/brackets';

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
    const name = formData.get('name') as string;
    const dateStr = formData.get('date') as string;
    const location = formData.get('location') as string;
    const type = formData.get('type') as string;
    const startImmediately = formData.get('startImmediately') === 'on';
    const participantIds = formData.getAll('participants') as string[];

    if (!name || !dateStr || !location) {
        throw new Error('Missing required fields');
    }

    const date = new Date(dateStr);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const tournament = await tx.tournament.create({
                data: {
                    name,
                    date,
                    location,
                    type: type || 'ELIMINATION',
                    status: startImmediately ? 'ACTIVE' : 'PLANNED',
                },
            });

            // Create RSVPs for selected participants
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

            // If start immediately, generate bracket
            if (startImmediately) {
                if (participantIds.length < 2) throw new Error('Für Sofort-Start werden mind. 2 Spieler benötigt.');

                const players = await tx.player.findMany({
                    where: { id: { in: participantIds } }
                });

                let matches;
                if (type === 'ROUND_ROBIN') {
                    matches = generateRoundRobinMatches(tournament.id, players);
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
        if (result.status === 'ACTIVE') {
            return { success: true, redirectUrl: `/tournaments/${result.id}` }; // Signal client to redirect
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to create tournament:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create tournament' };
    }
}

export async function startTournament(tournamentId: string) {
    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                rsvps: { include: { player: true } },
                matches: { include: { player1: true, player2: true }, orderBy: { id: 'asc' } }
            }
        });

        if (!tournament) throw new Error('Tournament not found');
        if (tournament.status !== 'PLANNED') throw new Error('Tournament already started or completed');

        const players = tournament.rsvps.map((r) => r.player);
        if (players.length < 2) throw new Error('Not enough players (min 2)');

        let matches;
        if (tournament.type === 'ROUND_ROBIN') {
            matches = generateRoundRobinMatches(tournament.id, players);
        } else {
            matches = generateSingleEliminationBracket(tournament.id, players);
        }

        // Transactional creation
        await prisma.$transaction(async (tx) => {
            await tx.tournament.update({
                where: { id: tournamentId },
                data: { status: 'ACTIVE' }
            });

            for (const match of matches) {
                await tx.match.create({ data: match });
            }
        });

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to start tournament:', error);
        return { success: false, error: 'Failed to start tournament' };
    }
}

export async function startPlayoffs(tournamentId: string) {
    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { matches: true, rsvps: { include: { player: true } } }
        });

        if (!tournament || tournament.type !== 'ROUND_ROBIN') throw new Error('Invalid tournament');

        // Check if all group matches are completed
        const unplayed = tournament.matches.filter(m => m.stage === 'GROUP' && !m.winnerId);
        if (unplayed.length > 0) throw new Error('Alle Gruppenspiele müssen beendet sein.');

        // Calculate Standings
        const { getTournamentStandings } = await import('@/lib/stats');
        const standings = await getTournamentStandings(tournamentId);

        if (standings.length < 2) throw new Error('Zu wenige Spieler für Finals.');

        const p1Id = standings[0].playerId;
        const p2Id = standings[1].playerId;
        const p3Id = standings.length > 2 ? standings[2].playerId : null;
        const p4Id = standings.length > 3 ? standings[3].playerId : null;

        // Transaction: Create Final and 3rd Place
        await prisma.$transaction(async (tx) => {
            // Final
            await tx.match.create({
                data: {
                    tournamentId,
                    round: 99, // Special round for Finals
                    position: 0,
                    stage: 'BRACKET', // It's a bracket stage now
                    player1Id: p1Id,
                    player2Id: p2Id
                }
            });

            // 3rd Place
            if (p3Id && p4Id) {
                await tx.match.create({
                    data: {
                        tournamentId,
                        round: 99,
                        position: 1,
                        stage: 'BRACKET',
                        player1Id: p3Id,
                        player2Id: p4Id
                    }
                });
            }
        });

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to start playoffs:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error' };
    }
}

export async function deleteTournament(tournamentId: string, adminCode: string) {
    if (adminCode !== process.env.ADMIN_PASSWORD) {
        return { success: false, error: 'Falsches Admin-Passwort' };
    }

    try {
        // Cascade delete matches and RSVPs usually handled by DB relations but Prisma specific.
        // Assuming implicit cascade or manual cleanup. Let's rely on Prisma schema cascade or do manual.
        // Prisma SQLite default doesn't always cascade. Safe to delete related first.

        await prisma.$transaction(async (tx) => {
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
    try {
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: 'COMPLETED' }
        });
        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Fehler beim Abschließen' };
    }
}
