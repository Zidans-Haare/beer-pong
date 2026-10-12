import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Die App läuft vom Startbildschirm: beim Nutzer vermerken. Bewusst ein einfacher Aufruf und keine Server Action:
// Eine Server Action lädt die aktuelle Seite neu, und das kollidiert beim Start mit der Weiterleitung von /login zur Startseite.
export async function POST() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false }, { status: 401 });
    try {
        await prisma.user.update({ where: { id: session.user.id }, data: { pwaInstalled: true } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
