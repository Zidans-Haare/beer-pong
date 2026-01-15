/**
 * Real-time Event Broadcasting Utilities
 *
 * This module provides functions to broadcast events to connected SSE clients.
 * Events are stored in memory and can be polled by the SSE endpoint.
 */

// Event types
export type TournamentEventType =
  | 'player_joined'
  | 'player_left'
  | 'match_updated'
  | 'match_completed'
  | 'tournament_started'
  | 'tournament_finished'
  | 'standings_updated'
  | 'presence_update';

export interface TournamentEvent {
  type: TournamentEventType;
  tournamentId: string;
  timestamp: number;
  data: unknown;
}

// In-memory event queue per tournament (last 50 events)
const eventQueues = new Map<string, TournamentEvent[]>();
const MAX_QUEUE_SIZE = 50;

// Presence tracking
const presenceMap = new Map<string, Map<string, { odName: string; odAvatar?: string; joinedAt: number }>>();

/**
 * Queue an event for a tournament
 */
export function queueEvent(
  tournamentId: string,
  type: TournamentEventType,
  data: unknown
): TournamentEvent {
  const event: TournamentEvent = {
    type,
    tournamentId,
    timestamp: Date.now(),
    data,
  };

  if (!eventQueues.has(tournamentId)) {
    eventQueues.set(tournamentId, []);
  }

  const queue = eventQueues.get(tournamentId)!;
  queue.push(event);

  // Trim queue to max size
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.shift();
  }

  return event;
}

/**
 * Get events since a timestamp
 */
export function getEventsSince(
  tournamentId: string,
  since: number
): TournamentEvent[] {
  const queue = eventQueues.get(tournamentId) || [];
  return queue.filter((e) => e.timestamp > since);
}

/**
 * Clear events for a tournament
 */
export function clearEvents(tournamentId: string): void {
  eventQueues.delete(tournamentId);
}

/**
 * Track user presence in a tournament lobby
 */
export function joinPresence(
  tournamentId: string,
  odId: string,
  name: string,
  avatar?: string
): void {
  if (!presenceMap.has(tournamentId)) {
    presenceMap.set(tournamentId, new Map());
  }

  presenceMap.get(tournamentId)!.set(odId, {
    odName: name,
    odAvatar: avatar,
    joinedAt: Date.now(),
  });

  queueEvent(tournamentId, 'presence_update', {
    action: 'join',
    odId,
    name,
    avatar,
  });
}

/**
 * Remove user from presence
 */
export function leavePresence(tournamentId: string, odId: string): void {
  const presence = presenceMap.get(tournamentId);
  if (presence) {
    const user = presence.get(odId);
    presence.delete(odId);

    if (user) {
      queueEvent(tournamentId, 'presence_update', {
        action: 'leave',
        odId,
        name: user.odName,
      });
    }

    // Clean up empty presence maps
    if (presence.size === 0) {
      presenceMap.delete(tournamentId);
    }
  }
}

/**
 * Get all present users in a tournament
 */
export function getPresence(
  tournamentId: string
): Array<{ odId: string; odName: string; odAvatar?: string; joinedAt: number }> {
  const presence = presenceMap.get(tournamentId);
  if (!presence) return [];

  return Array.from(presence.entries()).map(([odId, data]) => ({
    odId,
    ...data,
  }));
}

/**
 * Heartbeat to keep presence alive (call every 30s)
 */
export function heartbeat(tournamentId: string, odId: string): void {
  const presence = presenceMap.get(tournamentId);
  if (presence && presence.has(odId)) {
    const user = presence.get(odId)!;
    user.joinedAt = Date.now(); // Update timestamp
  }
}

/**
 * Clean up stale presence (users who haven't sent heartbeat in 60s)
 */
export function cleanupStalePresence(tournamentId: string): void {
  const presence = presenceMap.get(tournamentId);
  if (!presence) return;

  const now = Date.now();
  const staleThreshold = 60 * 1000; // 60 seconds

  for (const [odId, data] of presence.entries()) {
    if (now - data.joinedAt > staleThreshold) {
      leavePresence(tournamentId, odId);
    }
  }
}

// Convenience functions for common events

export function emitPlayerJoined(
  tournamentId: string,
  player: { id: string; name: string }
): void {
  queueEvent(tournamentId, 'player_joined', player);
}

export function emitPlayerLeft(
  tournamentId: string,
  player: { id: string; name: string }
): void {
  queueEvent(tournamentId, 'player_left', player);
}

export function emitMatchUpdated(
  tournamentId: string,
  match: { id: string; player1?: string; player2?: string; score1?: number; score2?: number }
): void {
  queueEvent(tournamentId, 'match_updated', match);
}

export function emitMatchCompleted(
  tournamentId: string,
  match: { id: string; winner: string; score: string }
): void {
  queueEvent(tournamentId, 'match_completed', match);
}

export function emitTournamentStarted(tournamentId: string): void {
  queueEvent(tournamentId, 'tournament_started', { tournamentId });
}

export function emitTournamentFinished(
  tournamentId: string,
  winner?: { id: string; name: string }
): void {
  queueEvent(tournamentId, 'tournament_finished', { tournamentId, winner });
}
