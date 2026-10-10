'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { broadcastNotification } from './notifications';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user?.id || !isAdmin(session.user.email)) throw new Error('Unauthorized');
}

type Result = { success: true } | { success: false; error: string };

// Veröffentlicht den Rückblick für alle Spieler und benachrichtigt sie
export async function publishWrapped(title: string, from: string, to: string): Promise<Result> {
    await requireAdmin();
    const name = title.trim();
    const startDate = new Date(from);
    const endDate = new Date(to);
    if (!name || name.length > 60) return { success: false, error: 'Bitte einen Titel mit höchstens 60 Zeichen eingeben' };
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) return { success: false, error: 'Ungültiger Zeitraum' };

    try {
        await prisma.wrapped.create({ data: { title: name, startDate, endDate, publishedAt: new Date() } });
        // Benachrichtigung darf die Veröffentlichung nicht scheitern lassen
        await broadcastNotification({
            title: `${name} ist da`,
            message: 'Dein Rückblick wartet: Spiele, Becher, Serien und dein Spielertyp.',
            link: '/wrapped',
            type: 'GENERIC',
        }).catch(error => console.error('Wrapped-Benachrichtigung fehlgeschlagen:', error));
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error('publishWrapped failed:', error);
        return { success: false, error: 'Veröffentlichen fehlgeschlagen' };
    }
}

export async function unpublishWrapped(id: string): Promise<Result> {
    await requireAdmin();
    try {
        await prisma.wrapped.update({ where: { id }, data: { publishedAt: null } });
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error('unpublishWrapped failed:', error);
        return { success: false, error: 'Zurückziehen fehlgeschlagen' };
    }
}
