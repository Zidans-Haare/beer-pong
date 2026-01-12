'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Use the VAPID keys you generated
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BM2vV...'; // We will assume user puts this in .env or we hardcode it for now if needed for demo
// REAL KEYS from previous step (you should put these in .env in production)
// Public: BPcE... (example)
// Private: ...

export async function saveSubscription(subscription: PushSubscriptionJSON) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.pushSubscription.create({
            data: {
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
