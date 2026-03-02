import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sinceParam = request.nextUrl.searchParams.get('since');
    const since = sinceParam ? new Date(sinceParam) : undefined;

    try {
        const messages = await prisma.chatMessage.findMany({
            where: since ? { createdAt: { gt: since } } : undefined,
            orderBy: { createdAt: 'asc' },
            take: 100,
            include: {
                user: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json([], { status: 500 });
    }
}
