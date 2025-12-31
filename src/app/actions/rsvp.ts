'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function submitRSVP(formData: FormData) {
    const tournamentId = formData.get('tournamentId') as string;
    const playerId = formData.get('playerId') as string;
    const status = formData.get('status') as string;

    if (!tournamentId || !playerId || !status) {
        throw new Error('Missing required fields');
    }

    try {
        await prisma.rSVP.upsert({
            where: {
                tournamentId_playerId: {
                    tournamentId,
                    playerId,
                },
            },
            update: { status },
            create: {
                tournamentId,
                playerId,
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
