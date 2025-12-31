'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getPlayers() {
    try {
        const players = await prisma.player.findMany({
            orderBy: { name: 'asc' },
        });
        return players;
    } catch (error) {
        console.error('Failed to fetch players:', error);
        throw new Error('Failed to fetch players');
    }
}

export async function createPlayer(formData: FormData) {
    const name = formData.get('name') as string;
    const nickname = formData.get('nickname') as string;
    const email = formData.get('email') as string;
    const image = formData.get('image') as string;
    const bio = formData.get('bio') as string;
    const motto = formData.get('motto') as string;
    const adminCode = formData.get('adminCode') as string;

    if (!name) {
        return { success: false, error: 'Name is required' };
    }

    if (adminCode !== process.env.ADMIN_PASSWORD) {
        return { success: false, error: 'Falscher Admin-Code!' };
    }

    try {
        await prisma.player.create({
            data: {
                name,
                nickname: nickname || null,
                email: email || null,
                image: image || null,
                bio: bio || null,
                motto: motto || null,
            },
        });
        revalidatePath('/players');
        return { success: true };
    } catch (error) {
        console.error('Failed to create player:', error);
        return { success: false, error: 'Failed to create player' };
    }
}

export async function deletePlayer(playerId: string, adminCode: string) {
    if (adminCode !== process.env.ADMIN_PASSWORD) {
        return { success: false, error: 'Falsches Admin-Passwort' };
    }

    try {
        await prisma.player.delete({ where: { id: playerId } });
        revalidatePath('/players');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete player:', error);
        return { success: false, error: 'Spieler konnte nicht gelöscht werden (evtl. existieren noch Matches)' };
    }
}
