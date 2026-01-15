import { NextRequest, NextResponse } from 'next/server';
import { getEventsSince, getPresence, heartbeat, joinPresence, leavePresence, cleanupStalePresence } from '@/lib/realtime';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET - Poll for new events and presence
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const since = parseInt(searchParams.get('since') || '0', 10);

  // Clean up stale presence
  cleanupStalePresence(tournamentId);

  // Get events since timestamp
  const events = getEventsSince(tournamentId, since);

  // Get current presence
  const presence = getPresence(tournamentId);

  return NextResponse.json({
    events,
    presence,
    timestamp: Date.now(),
  });
}

/**
 * POST - Join presence / heartbeat
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action || 'heartbeat';

  // Get user's player profile
  const player = await prisma.player.findFirst({
    where: { userId: session.user.id },
    select: { id: true, name: true, image: true },
  });

  if (!player) {
    return NextResponse.json({ error: 'Kein Spielerprofil' }, { status: 400 });
  }

  switch (action) {
    case 'join':
      joinPresence(tournamentId, player.id, player.name, player.image || undefined);
      break;

    case 'leave':
      leavePresence(tournamentId, player.id);
      break;

    case 'heartbeat':
    default:
      // If not in presence, join first
      const presence = getPresence(tournamentId);
      if (!presence.find((p) => p.odId === player.id)) {
        joinPresence(tournamentId, player.id, player.name, player.image || undefined);
      } else {
        heartbeat(tournamentId, player.id);
      }
      break;
  }

  return NextResponse.json({
    success: true,
    presence: getPresence(tournamentId),
  });
}
