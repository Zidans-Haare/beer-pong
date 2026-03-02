'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { emitPlayerJoined, emitPlayerLeft } from '@/lib/realtime';

import { auth } from '@/auth';

export async function submitRSVP(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    const tournamentId = formData.get('tournamentId') as string;
    const status = formData.get('status') as string;

    if (!tournamentId || !status) {
        return { success: false, error: 'Missing required fields' };
    }

    const VALID_STATUSES = ['YES', 'NO', 'MAYBE'];
    if (!VALID_STATUSES.includes(status)) {
        return { success: false, error: 'Ungültiger Status' };
    }

    try {
        // Find player for current user
        const player = await prisma.player.findUnique({
            where: { userId: session.user.id }
        });

        if (!player) {
            return { success: false, error: 'Bitte erstelle erst ein Spielerprofil.' };
        }

        // Check if this is a new RSVP or status change
        const existingRsvp = await prisma.rSVP.findUnique({
            where: {
                tournamentId_playerId: {
                    tournamentId,
                    playerId: player.id,
                },
            },
        });

        await prisma.rSVP.upsert({
            where: {
                tournamentId_playerId: {
                    tournamentId,
                    playerId: player.id,
                },
            },
            update: { status },
            create: {
                tournamentId,
                playerId: player.id,
                status,
            },
        });

        // Emit realtime events based on status change
        if (status === 'YES' && existingRsvp?.status !== 'YES') {
            emitPlayerJoined(tournamentId, { id: player.id, name: player.name });
        } else if (status !== 'YES' && existingRsvp?.status === 'YES') {
            emitPlayerLeft(tournamentId, { id: player.id, name: player.name });
        }

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to submit RSVP:', error);
        return { success: false, error: 'Failed to submit RSVP' };
    }
}

/**
 * Action to join a tournament (called when user scans QR code or uses join code)
 * Automatically sets RSVP to YES for logged-in users
 */
export async function joinTournamentAction(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    try {
        // Check if tournament exists
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament) {
            return { success: false, error: 'Turnier nicht gefunden' };
        }

        // Find player for current user
        const player = await prisma.player.findUnique({
            where: { userId: session.user.id }
        });

        if (!player) {
            return { success: false, error: 'Bitte erstelle erst ein Spielerprofil.' };
        }

        // Check if already RSVP'd
        const existingRsvp = await prisma.rSVP.findUnique({
            where: {
                tournamentId_playerId: {
                    tournamentId,
                    playerId: player.id,
                },
            },
        });

        // Only create/update if not already YES
        if (existingRsvp?.status !== 'YES') {
            await prisma.rSVP.upsert({
                where: {
                    tournamentId_playerId: {
                        tournamentId,
                        playerId: player.id,
                    },
                },
                update: { status: 'YES' },
                create: {
                    tournamentId,
                    playerId: player.id,
                    status: 'YES',
                },
            });

            // Emit realtime event
            emitPlayerJoined(tournamentId, { id: player.id, name: player.name });
        }

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to join tournament:', error);
        return { success: false, error: 'Fehler beim Beitritt' };
    }
}

export async function getTournament(id: string) {
    return await prisma.tournament.findUnique({
        where: { id },
        include: {
            rsvps: {
                include: {
                    player: true,
                },
            },
            matches: {
                include: {
                    player1: true,
                    player2: true
                }
            }
        },
    });
}
