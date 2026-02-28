'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getBringItems(tournamentId: string) {
    try {
        const items = await prisma.bringItem.findMany({
            where: { tournamentId },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                category: true,
                userId: true,
                userName: true,
            },
        });
        return items;
    } catch (error) {
        console.error('Failed to fetch bring items:', error);
        return [];
    }
}

export async function toggleBringItem(tournamentId: string, category: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt.' };
    }

    const userId = session.user.id;
    const userName = session.user.name ?? 'Unbekannt';

    try {
        const existing = await prisma.bringItem.findUnique({
            where: {
                tournamentId_category_userId: { tournamentId, category, userId },
            },
        });

        if (existing) {
            await prisma.bringItem.delete({ where: { id: existing.id } });
        } else {
            await prisma.bringItem.create({
                data: { tournamentId, category, userId, userName },
            });
        }

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Toggle bring item failed:', error);
        return { success: false, error: 'Fehler beim Aktualisieren.' };
    }
}
