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
                quantity: true,
            },
        });
        return items;
    } catch (error) {
        console.error('Failed to fetch bring items:', error);
        return [];
    }
}

export async function setBringItem(tournamentId: string, category: string, quantity: number) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt.' };
    }

    const userId = session.user.id;
    const userName = session.user.name ?? 'Unbekannt';

    try {
        if (quantity <= 0) {
            await prisma.bringItem.deleteMany({
                where: { tournamentId, category, userId },
            });
        } else {
            await prisma.bringItem.upsert({
                where: { tournamentId_category_userId: { tournamentId, category, userId } },
                update: { quantity, userName },
                create: { tournamentId, category, userId, userName, quantity },
            });
        }

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Set bring item failed:', error);
        return { success: false, error: 'Fehler beim Aktualisieren.' };
    }
}
