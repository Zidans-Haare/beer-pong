import { prisma } from "@/lib/prisma";
import webpush from "web-push";

// Initialize web-push
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey && publicKey.length > 20 && privateKey.length > 20) {
    webpush.setVapidDetails("mailto:admin@example.com", publicKey, privateKey);
}

/**
 * Sends a push notification to a specific user (by userId).
 * Also creates an in-app notification.
 */
export async function sendPushToUser(
    userId: string,
    title: string,
    message: string,
    link?: string
) {
    try {
        // 1. Create in-app notification
        await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                link,
                type: "GENERIC",
            },
        });

        // 2. Send web push notification
        const subscriptions = await (prisma as any).pushSubscription.findMany({
            where: { userId },
        });

        if (subscriptions.length > 0) {
            const payload = JSON.stringify({ title, message, link });

            await Promise.all(
                subscriptions.map((sub: any) =>
                    webpush
                        .sendNotification(
                            {
                                endpoint: sub.endpoint,
                                keys: {
                                    p256dh: sub.p256dh,
                                    auth: sub.auth,
                                },
                            },
                            payload
                        )
                        .catch((err) => {
                            console.error("Push failed for sub", sub.id, err);
                            // Clean up expired subscriptions
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                (prisma as any).pushSubscription
                                    .delete({ where: { id: sub.id } })
                                    .catch(console.error);
                            }
                        })
                )
            );
        }

        return { success: true };
    } catch (error) {
        console.error("sendPushToUser failed:", error);
        return { success: false, error };
    }
}
