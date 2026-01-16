'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

/**
 * Create a new team for a tournament
 */
export async function createTeam(tournamentId: string, name?: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    // Verify tournament exists and is in TEAM mode
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
    });

    if (!tournament) {
        return { success: false, error: 'Turnier nicht gefunden' };
    }

    if (tournament.mode !== 'TEAM') {
        return { success: false, error: 'Turnier ist kein Team-Modus' };
    }

    // Only host can create teams
    if (tournament.hostId !== session.user.id) {
        return { success: false, error: 'Nur der Host kann Teams erstellen' };
    }

    try {
        const team = await prisma.team.create({
            data: {
                tournamentId,
                name: name?.trim() || null
            }
        });

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true, team };
    } catch (error) {
        console.error('Failed to create team:', error);
        return { success: false, error: 'Team konnte nicht erstellt werden' };
    }
}

/**
 * Update team name
 */
export async function updateTeamName(teamId: string, name: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { tournament: true }
    });

    if (!team) {
        return { success: false, error: 'Team nicht gefunden' };
    }

    if (team.tournament.hostId !== session.user.id) {
        return { success: false, error: 'Nur der Host kann Teams bearbeiten' };
    }

    try {
        const updated = await prisma.team.update({
            where: { id: teamId },
            data: { name: name.trim() || null }
        });

        revalidatePath(`/tournaments/${team.tournamentId}`);
        return { success: true, team: updated };
    } catch (error) {
        return { success: false, error: 'Fehler beim Aktualisieren' };
    }
}

/**
 * Assign a player or guest to a team slot
 */
export async function assignToTeam(
    teamId: string,
    slot: 'player1' | 'player2' | 'guest1' | 'guest2',
    memberId: string | null
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { tournament: true }
    });

    if (!team) {
        return { success: false, error: 'Team nicht gefunden' };
    }

    if (team.tournament.hostId !== session.user.id) {
        return { success: false, error: 'Nur der Host kann Teams bearbeiten' };
    }

    // Build update data based on slot
    const updateData: Record<string, string | null> = {};

    switch (slot) {
        case 'player1':
            updateData.player1Id = memberId;
            break;
        case 'player2':
            updateData.player2Id = memberId;
            break;
        case 'guest1':
            updateData.guest1Id = memberId;
            break;
        case 'guest2':
            updateData.guest2Id = memberId;
            break;
    }

    try {
        // If assigning (not clearing), check if member is already in another team
        if (memberId) {
            const slotField = slot.startsWith('player') ? `${slot}Id` : `${slot}Id`;
            const existingTeam = await prisma.team.findFirst({
                where: {
                    tournamentId: team.tournamentId,
                    id: { not: teamId },
                    OR: [
                        { player1Id: memberId },
                        { player2Id: memberId },
                        { guest1Id: memberId },
                        { guest2Id: memberId }
                    ]
                }
            });

            if (existingTeam) {
                // Remove from existing team first
                await prisma.team.update({
                    where: { id: existingTeam.id },
                    data: {
                        player1Id: existingTeam.player1Id === memberId ? null : existingTeam.player1Id,
                        player2Id: existingTeam.player2Id === memberId ? null : existingTeam.player2Id,
                        guest1Id: existingTeam.guest1Id === memberId ? null : existingTeam.guest1Id,
                        guest2Id: existingTeam.guest2Id === memberId ? null : existingTeam.guest2Id
                    }
                });
            }
        }

        const updated = await prisma.team.update({
            where: { id: teamId },
            data: updateData,
            include: {
                player1: true,
                player2: true,
                guest1: true,
                guest2: true
            }
        });

        revalidatePath(`/tournaments/${team.tournamentId}`);
        return { success: true, team: updated };
    } catch (error) {
        console.error('Failed to assign to team:', error);
        return { success: false, error: 'Zuweisung fehlgeschlagen' };
    }
}

/**
 * Delete a team (only if empty)
 */
export async function deleteTeam(teamId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { tournament: true }
    });

    if (!team) {
        return { success: false, error: 'Team nicht gefunden' };
    }

    if (team.tournament.hostId !== session.user.id) {
        return { success: false, error: 'Nur der Host kann Teams löschen' };
    }

    try {
        await prisma.team.delete({
            where: { id: teamId }
        });

        revalidatePath(`/tournaments/${team.tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to delete team:', error);
        return { success: false, error: 'Team konnte nicht gelöscht werden' };
    }
}

/**
 * Get all teams for a tournament
 */
export async function getTournamentTeams(tournamentId: string) {
    return prisma.team.findMany({
        where: { tournamentId },
        include: {
            player1: { select: { id: true, name: true, image: true } },
            player2: { select: { id: true, name: true, image: true } },
            guest1: { select: { id: true, name: true } },
            guest2: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'asc' }
    });
}

/**
 * Auto-assign players and guests to teams
 * Creates teams as needed and fills them randomly
 */
export async function autoAssignTeams(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            rsvps: {
                where: { status: 'YES' },
                include: { player: true }
            },
            guests: {
                where: { expiresAt: { gt: new Date() } }
            },
            teams: true
        }
    });

    if (!tournament) {
        return { success: false, error: 'Turnier nicht gefunden' };
    }

    if (tournament.hostId !== session.user.id) {
        return { success: false, error: 'Nur der Host kann Teams zuweisen' };
    }

    if (tournament.mode !== 'TEAM') {
        return { success: false, error: 'Turnier ist kein Team-Modus' };
    }

    // Collect all available players and guests
    const players = tournament.rsvps.map(r => ({
        type: 'player' as const,
        id: r.player.id,
        name: r.player.name
    }));

    const guests = tournament.guests.map(g => ({
        type: 'guest' as const,
        id: g.id,
        name: g.name
    }));

    // Combine and shuffle
    const allMembers = [...players, ...guests];
    for (let i = allMembers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allMembers[i], allMembers[j]] = [allMembers[j], allMembers[i]];
    }

    // Calculate needed teams
    const neededTeams = Math.ceil(allMembers.length / 2);

    try {
        // Delete existing teams
        await prisma.team.deleteMany({
            where: { tournamentId }
        });

        // Create new teams and assign members
        const createdTeams = [];
        for (let i = 0; i < neededTeams; i++) {
            const member1 = allMembers[i * 2];
            const member2 = allMembers[i * 2 + 1];

            const teamData: {
                tournamentId: string;
                name: string;
                player1Id?: string;
                player2Id?: string;
                guest1Id?: string;
                guest2Id?: string;
            } = {
                tournamentId,
                name: `Team ${i + 1}`
            };

            if (member1) {
                if (member1.type === 'player') {
                    teamData.player1Id = member1.id;
                } else {
                    teamData.guest1Id = member1.id;
                }
            }

            if (member2) {
                if (member2.type === 'player') {
                    teamData.player2Id = member2.id;
                } else {
                    teamData.guest2Id = member2.id;
                }
            }

            const team = await prisma.team.create({ data: teamData });
            createdTeams.push(team);
        }

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true, teams: createdTeams, teamsCreated: createdTeams.length };
    } catch (error) {
        console.error('Failed to auto-assign teams:', error);
        return { success: false, error: 'Auto-Zuweisung fehlgeschlagen' };
    }
}

