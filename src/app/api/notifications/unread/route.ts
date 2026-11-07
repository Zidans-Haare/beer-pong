import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Zahl der ungelesenen Benachrichtigungen. Bewusst eine GET-Route statt einer Server-Aktion:
// Server-Aktionen laufen nacheinander mit Seitenwechseln und halten die Navigation auf.
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ count: 0 });
    try {
        const count = await prisma.notification.count({ where: { userId: session.user.id, isRead: false } });
        return NextResponse.json({ count }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Failed to count notifications:', error);
        return NextResponse.json({ count: 0 });
    }
}
