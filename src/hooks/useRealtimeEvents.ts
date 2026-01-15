'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface RealtimeEvent {
  type: string;
  tournamentId: string;
  timestamp: number;
  data: unknown;
}

interface UseRealtimeEventsOptions {
  tournamentId: string;
  pollInterval?: number;
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
}

interface UseRealtimeEventsReturn {
  events: RealtimeEvent[];
  isConnected: boolean;
  lastUpdate: number;
  refresh: () => Promise<void>;
}

/**
 * Hook for receiving real-time tournament events via polling
 */
export function useRealtimeEvents({
  tournamentId,
  pollInterval = 5000,
  onEvent,
  enabled = true,
}: UseRealtimeEventsOptions): UseRealtimeEventsReturn {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(0);
  const timestampRef = useRef(0);
  const onEventRef = useRef(onEvent);

  // Keep onEvent ref up to date
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const poll = useCallback(async () => {
    if (!enabled) return;

    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/poll?since=${timestampRef.current}`
      );

      if (!res.ok) throw new Error('Poll failed');

      const data = await res.json();
      setIsConnected(true);
      timestampRef.current = data.timestamp;
      setLastUpdate(data.timestamp);

      // Process new events
      if (data.events.length > 0) {
        setEvents((prev) => [...prev, ...data.events].slice(-100)); // Keep last 100

        // Call onEvent callback for each new event
        data.events.forEach((event: RealtimeEvent) => {
          onEventRef.current?.(event);
        });
      }
    } catch (error) {
      console.error('Realtime poll error:', error);
      setIsConnected(false);
    }
  }, [tournamentId, enabled]);

  // Start polling
  useEffect(() => {
    if (!enabled) return;

    poll();
    const interval = setInterval(poll, pollInterval);

    return () => clearInterval(interval);
  }, [poll, pollInterval, enabled]);

  const refresh = useCallback(async () => {
    timestampRef.current = 0;
    setEvents([]);
    await poll();
  }, [poll]);

  return {
    events,
    isConnected,
    lastUpdate,
    refresh,
  };
}

/**
 * Hook specifically for match updates
 */
export function useMatchUpdates(
  tournamentId: string,
  onMatchUpdate?: (matchId: string, data: unknown) => void
) {
  return useRealtimeEvents({
    tournamentId,
    onEvent: (event) => {
      if (event.type === 'match_updated' || event.type === 'match_completed') {
        const data = event.data as { id: string };
        onMatchUpdate?.(data.id, event.data);
      }
    },
  });
}
