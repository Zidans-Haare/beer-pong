import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
    // Reading chat is public — TV screens are unauthenticated
    const sinceParam = request.nextUrl.searchParams.get('since');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const since = sinceParam ? new Date(sinceParam) : undefined;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 100;

    try {
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
