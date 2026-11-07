import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
    // Reading chat is public — TV screens are unauthenticated
    const sinceParam = request.nextUrl.searchParams.get('since');
    const beforeParam = request.nextUrl.searchParams.get('before');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const since = sinceParam ? new Date(sinceParam) : undefined;
    const before = beforeParam ? new Date(beforeParam) : undefined;
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 1), 100) : 100;
    if ((since && isNaN(since.getTime())) || (before && isNaN(before.getTime()))) return NextResponse.json([], { status: 400 });

    try {
        // Ältere Nachrichten beim Hochscrollen: die letzten `limit` vor `before`, wieder in zeitlicher Reihenfolge
        if (before) {
            const older = await prisma.chatMessage.findMany({
                where: { createdAt: { lt: before } },
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: { user: { select: { id: true, name: true, image: true } } },
            });
            return NextResponse.json(older.reverse());
        }
        const messages = await prisma.chatMessage.findMany({
            where: since ? { createdAt: { gt: since } } : undefined,
            orderBy: { createdAt: 'asc' },
            take: limit,
            include: {
                user: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        return NextResponse.json(messages);
    } catch (error) {
        logger.error({ err: error }, 'Chat API error');
        return NextResponse.json([], { status: 500 });
    }
}
