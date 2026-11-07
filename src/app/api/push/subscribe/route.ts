import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Push-Anmeldung eines Geräts speichern oder auffrischen. Ein einfacher Aufruf statt Server Action, weil die App das
// beim Start im Hintergrund erledigt (eine Server Action würde die Seite neu laden, siehe /api/pwa-status).
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false }, { status: 401 });
    const body = await request.json().catch(() => null) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
    const endpoint = body?.endpoint, p256dh = body?.keys?.p256dh, key = body?.keys?.auth;
    // nur echte Push-Dienste über HTTPS, keine beliebigen Adressen
    if (typeof endpoint !== 'string' || !/^https:\/\/[^\s]{8,800}$/.test(endpoint) || typeof p256dh !== 'string' || typeof key !== 'string' || p256dh.length > 200 || key.length > 100) {
        return NextResponse.json({ success: false }, { status: 400 });
    }
    try {
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: { p256dh, auth: key, userId: session.user.id },
            create: { userId: session.user.id, endpoint, p256dh, auth: key },
        });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
