import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Kurzlink auf die eigene Figur-Seite, z. B. aus dem „Neu“-Hinweis nach einem Update
export async function GET(request: Request) {
    const session = await auth();
    const player = session?.user?.id ? await prisma.player.findFirst({ where: { userId: session.user.id }, select: { id: true } }) : null;
    return NextResponse.redirect(new URL(player ? `/players/${player.id}/figure` : '/players', request.url));
}
