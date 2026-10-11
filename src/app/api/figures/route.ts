import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { loadFigureMap } from '@/lib/figure-server';

export const dynamic = 'force-dynamic';

// Figuren aller Spieler und der eigene Name, für Szenen, die im Browser gezeichnet werden (zum Beispiel der Betrunken-Modus)
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [figures, me] = await Promise.all([
        loadFigureMap(),
        prisma.player.findUnique({ where: { userId: session.user.id }, select: { name: true } }),
    ]);
    return NextResponse.json({ me: me?.name.trim() ?? null, figures }, { headers: { 'Cache-Control': 'no-store' } });
}
