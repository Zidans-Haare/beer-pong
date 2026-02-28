'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getChatMessages(limit = 50) {
    try {
        const messages = await prisma.chatMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: { id: true, name: true, image: true },
                },
            },
        });
        // Return in chronological order
        return messages.reverse();
    } catch (error) {
        console.error('Failed to fetch chat messages:', error);
        return [];
    }
}

export async function sendChatMessage(text: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt.' };
    }

    // Verify user is ACTIVE
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
        return { success: false, error: 'Kein Zugriff.' };
    }

    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 1) {
        return { success: false, error: 'Nachricht darf nicht leer sein.' };
    }
    if (trimmed.length > 500) {
        return { success: false, error: 'Nachricht darf maximal 500 Zeichen lang sein.' };
    }

    // Rate limit: no message within the last 3 seconds
    const lastMessage = await prisma.chatMessage.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
    });
    if (lastMessage) {
        const diffMs = Date.now() - new Date(lastMessage.createdAt).getTime();
        if (diffMs < 3000) {
            return { success: false, error: 'Bitte warte kurz, bevor du erneut schreibst.' };
        }
    }

    try {
        const message = await prisma.chatMessage.create({
            data: {
                userId: session.user.id,
                text: trimmed,
            },
            include: {
                user: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        revalidatePath('/chat');
        return { success: true, message };
    } catch (error) {
        console.error('Failed to send chat message:', error);
        return { success: false, error: 'Nachricht konnte nicht gesendet werden.' };
    }
}
