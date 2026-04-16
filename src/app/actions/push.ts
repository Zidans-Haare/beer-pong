'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// VAPID public key must be set via NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env

export async function saveSubscription(subscription: PushSubscriptionJSON) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        await (prisma as any).pushSubscription.upsert({
            where: { endpoint: subscription.endpoint! },
            update: {
                p256dh: subscription.keys!.p256dh,
                auth: subscription.keys!.auth,
                userId: session.user.id,
            },
            create: {
                userId: session.user.id,
                endpoint: subscription.endpoint!,
                p256dh: subscription.keys!.p256dh,
                auth: subscription.keys!.auth,
            },
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to save subscription:', error);
        return { success: false, error: 'Failed' };
    }
}

export async function getVapidPublicKey() {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

import webpush from 'web-push';

export async function sendTestPush() {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const subscriptions = await (prisma as any).pushSubscription.findMany({
            where: { userId: session.user.id }
        });

        if (subscriptions.length === 0) {
            return { success: false, error: 'Kein Push-Abonnement gefunden. Bitte erst aktivieren.' };
        }

        const payload = JSON.stringify({
            title: 'Test Benachrichtigung 🍺',
            message: 'Wenn du das siehst, funktioniert Push!',
            link: '/notifications'
        });

        // Initialize web-push if not already done in this context
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        if (publicKey && privateKey) {
            const contact = process.env.VAPID_CONTACT;
            webpush.setVapidDetails(contact!, publicKey, privateKey);
        }

        await Promise.all(subscriptions.map((sub: any) => {
            return webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }, payload);
        }));

        return { success: true };
    } catch (error) {
        console.error('Test push failed:', error);
        return { success: false, error: 'Fehler beim Senden des Tests' };
    }
}
