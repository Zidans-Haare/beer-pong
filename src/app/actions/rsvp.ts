'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

    try {
        // Find player for current user
        const player = await prisma.player.findUnique({
            where: { userId: session.user.id }
        });

        if (!player) {
            return { success: false, error: 'Bitte erstelle erst ein Spielerprofil.' };
        }

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
        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to submit RSVP:', error);
        return { success: false, error: 'Failed to submit RSVP' };
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
