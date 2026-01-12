'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getNotifications() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 20, // Limit to recent 20
        });
        return notifications;
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        return [];
    }
}

export async function markNotificationAsRead(notificationId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.notification.update({
            where: {
                id: notificationId,
                userId: session.user.id, // Ensure ownership
            },
            data: {
                isRead: true,
            },
        });

        // We don't necessarily need to revalidate path if we manage state locally, 
        // but good practice if we want fresh data on reload.
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to mark notification:', error);
        return { success: false, error: 'Failed to update' };
    }
}

export async function markAllNotificationsAsRead() {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.notification.updateMany({
            where: {
                userId: session.user.id,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to mark all read:', error);
        return { success: false, error: 'Failed' };
    }
}

// ... existing code ...

export async function updateNotificationPreferences(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const notifyNewTournaments = formData.get('notifyNewTournaments') === 'on';
        const notifyUpdates = formData.get('notifyUpdates') === 'on';
        const notifyLiveTicker = formData.get('notifyLiveTicker') === 'on';

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                notifyNewTournaments,
                notifyUpdates,
                notifyLiveTicker
            }
        });

        revalidatePath('/profile'); // or wherever settings are
        return { success: true };
    } catch (error) {
        console.error('Failed to update settings:', error);
        return { success: false, error: 'Update failed' };
    }
}

export async function sendManualBroadcast(formData: FormData) {
    const session = await auth();
    // In a real app, check for ADMIN role here
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const title = formData.get('title') as string;
    const message = formData.get('message') as string;
    const type = formData.get('type') as NotificationType;

    if (!title || !message || !type) {
        return { success: false, error: 'Missing fields' };
    }

    return await broadcastNotification({
        title,
        message,
        type,
        link: '/tournaments' // Default link for now
    });
}

export async function getNotificationPreferences() {
    const session = await auth();
    if (!session?.user?.id) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                notifyNewTournaments: true,
                notifyUpdates: true,
                notifyLiveTicker: true
            }
        });
        return user;
    } catch (error) {
        return null;
    }
}

export type NotificationType = 'TOURNAMENT' | 'UPDATE' | 'SYSTEM' | 'GENERIC' | 'TICKER';

export async function broadcastNotification({
    title,
    message,
    link,
    type,
}: {
    title: string;
    message: string;
    link?: string;
    type: NotificationType;
}) {
    // This is an internal admin-like function, but for now we won't protect it strictly 
    // against internal calls, but ideally check for admin role here.

    try {
        // Filter users based on preferences
        const whereClause: any = {};
        if (type === 'TOURNAMENT') {
            whereClause.notifyNewTournaments = true;
        } else if (type === 'UPDATE') {
            whereClause.notifyUpdates = true;
        } else if (type === 'TICKER') {
            whereClause.notifyLiveTicker = true;
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true },
        });

        if (users.length === 0) return { success: true, count: 0 };

        // Create notifications in batched transactions or Promise.all
        // For large user bases, this should be a queue/job.
        // For now, simple Promise.all is fine.

        await prisma.notification.createMany({
            data: users.map(user => ({
                userId: user.id,
                title,
                message,
                link,
                type,
            }))
        });

        return { success: true, count: users.length };
    } catch (error) {
        console.error('Broadcast failed:', error);
        return { success: false, error: 'Broadcast failed' };
    }
}

// ... existing createNotificationForUser ...

export async function createNotificationForUser({
    userId,
    title,
    message,
    link,
    type
}: {
    userId: string;
    title: string;
    message: string;
    link?: string;
    type: NotificationType;
}) {
    try {
        await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                link,
                type
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Create notification failed:', error);
        return { success: false, error: 'Failed to create' };
    }
}
