import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { cookies } from 'next/headers';

// Store active connections per tournament
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Store last known state for each tournament
const tournamentStates = new Map<string, string>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const cookieStore = await cookies();
  const guestCookie = cookieStore.get('bierpong_guest_session');

  if (!session?.user?.id && !guestCookie?.value) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id: tournamentId } = await params;

  // Verify tournament exists
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true },
  });

  if (!tournament) {
    return new Response('Tournament not found', { status: 404 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the tournament's connection set
      if (!connections.has(tournamentId)) {
        connections.set(tournamentId, new Set());
      }
      connections.get(tournamentId)!.add(controller);

      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        tournamentId,
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectEvent));

      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          const keepalive = `: keepalive ${Date.now()}\n\n`;
          controller.enqueue(new TextEncoder().encode(keepalive));
        } catch {
          clearInterval(keepaliveInterval);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        connections.get(tournamentId)?.delete(controller);
        if (connections.get(tournamentId)?.size === 0) {
          connections.delete(tournamentId);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * Broadcast an event to all connected clients for a tournament
 */
function broadcastToTournament(
  tournamentId: string,
  eventType: string,
  data: unknown
) {
  const tournamentConnections = connections.get(tournamentId);
  if (!tournamentConnections || tournamentConnections.size === 0) return;

  const event = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(event);

  tournamentConnections.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch {
      // Connection closed, will be cleaned up
      tournamentConnections.delete(controller);
    }
  });
}

/**
 * Get count of active connections for a tournament
 */
function getConnectionCount(tournamentId: string): number {
  return connections.get(tournamentId)?.size || 0;
}
