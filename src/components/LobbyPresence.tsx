'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface PresenceUser {
  odId: string;
  odName: string;
  odAvatar?: string;
  joinedAt: number;
}

interface LobbyPresenceProps {
  tournamentId: string;
  pollInterval?: number;
}

export default function LobbyPresence({
  tournamentId,
  pollInterval = 5000,
}: LobbyPresenceProps) {
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [showToast, setShowToast] = useState<string | null>(null);
  const lastSeenRef = useRef<Set<string>>(new Set());
  const timestampRef = useRef(0);

  // Poll for updates
  const poll = useCallback(async () => {
    try {
      // Send heartbeat
      await fetch(`/api/tournaments/${tournamentId}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat' }),
      });

      // Get updates
      const res = await fetch(
        `/api/tournaments/${tournamentId}/poll?since=${timestampRef.current}`
      );

      if (!res.ok) throw new Error('Poll failed');

      const data = await res.json();
      setIsConnected(true);
      timestampRef.current = data.timestamp;

      // Check for new joiners
      const currentIds = new Set<string>(data.presence.map((p: PresenceUser) => p.odId));
      const newJoiners = data.presence.filter(
        (p: PresenceUser) => !lastSeenRef.current.has(p.odId)
      );

      // Show toast for new joiners (but not on first load)
      if (lastSeenRef.current.size > 0 && newJoiners.length > 0) {
        const names = newJoiners.map((p: PresenceUser) => p.odName).join(', ');
        setShowToast(`${names} ist beigetreten`);
        haptic.light();
        setTimeout(() => setShowToast(null), 3000);
      }

      lastSeenRef.current = currentIds;
      setPresence(data.presence);
    } catch (error) {
      console.error('Presence poll error:', error);
      setIsConnected(false);
    }
  }, [tournamentId]);

  // Initial join and polling
  useEffect(() => {
    // Join presence
    fetch(`/api/tournaments/${tournamentId}/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join' }),
    });

    // Start polling
    poll();
    const interval = setInterval(poll, pollInterval);

    // Leave on unmount
    return () => {
      clearInterval(interval);
      fetch(`/api/tournaments/${tournamentId}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      });
    };
  }, [tournamentId, poll, pollInterval]);

  return (
    <>
      {/* Presence Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--color-surface-hover)',
          borderRadius: 20,
          fontSize: '0.85rem',
        }}
      >
        {isConnected ? (
          <Wifi size={16} style={{ color: 'var(--color-success)' }} />
        ) : (
          <WifiOff size={16} style={{ color: 'var(--color-error)' }} />
        )}

        <Users size={16} style={{ color: 'var(--color-text-dim)' }} />
        <span style={{ color: 'var(--color-text-dim)' }}>
          {presence.length} online
        </span>

        {/* Avatar stack */}
        {presence.length > 0 && (
          <div style={{ display: 'flex', marginLeft: 4 }}>
            {presence.slice(0, 5).map((user, i) => (
              <motion.div
                key={user.odId}
                initial={{ scale: 0, x: -10 }}
                animate={{ scale: 1, x: 0 }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: user.odAvatar
                    ? `url(${user.odAvatar}) center/cover`
                    : getAvatarColor(user.odName),
                  border: '2px solid var(--color-surface)',
                  marginLeft: i > 0 ? -8 : 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'white',
                  zIndex: 5 - i,
                }}
                title={user.odName}
              >
                {!user.odAvatar && user.odName.charAt(0).toUpperCase()}
              </motion.div>
            ))}
            {presence.length > 5 && (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--color-text-dim)',
                  border: '2px solid var(--color-surface)',
                  marginLeft: -8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                +{presence.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Join Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed',
              bottom: 'calc(100px + env(safe-area-inset-bottom))',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--color-success)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: 20,
              fontSize: '0.9rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>👋</span>
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Generate consistent color based on name
function getAvatarColor(name: string): string {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
