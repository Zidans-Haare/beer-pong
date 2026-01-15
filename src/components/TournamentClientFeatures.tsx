'use client';

import { useEffect, useState } from 'react';
import { useTournamentWakeLock } from '@/hooks/useWakeLock';
import { CelebrationConfetti } from './Confetti';
import { haptic } from '@/lib/haptics';

interface TournamentClientFeaturesProps {
  tournamentId: string;
  tournamentStatus: string;
  isWinner?: boolean;
}

export default function TournamentClientFeatures({
  tournamentId,
  tournamentStatus,
  isWinner = false,
}: TournamentClientFeaturesProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const isRunning = tournamentStatus === 'ACTIVE';

  // Wake lock for active tournaments
  const wakeLock = useTournamentWakeLock(isRunning);

  // Show confetti when tournament is completed (only once per session)
  useEffect(() => {
    if (tournamentStatus === 'COMPLETED') {
      // Check if we've already shown confetti for this tournament
      const shownKey = `confetti-shown-${tournamentId}`;
      const alreadyShown = sessionStorage.getItem(shownKey);

      if (!alreadyShown) {
        // Delay slightly for dramatic effect
        const timer = setTimeout(() => {
          setShowConfetti(true);
          haptic.success();
          sessionStorage.setItem(shownKey, 'true');
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [tournamentId, tournamentStatus]);

  // Extra confetti if user is the winner
  useEffect(() => {
    if (isWinner && tournamentStatus === 'COMPLETED') {
      const winnerKey = `winner-confetti-${tournamentId}`;
      const alreadyShown = sessionStorage.getItem(winnerKey);

      if (!alreadyShown) {
        const timer = setTimeout(() => {
          setShowConfetti(true);
          haptic.heavy();
          sessionStorage.setItem(winnerKey, 'true');
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [isWinner, tournamentId, tournamentStatus]);

  return (
    <>
      <CelebrationConfetti
        show={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Wake lock indicator for active tournaments */}
      {isRunning && wakeLock.isActive && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            right: 16,
            background: 'var(--color-success)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: 20,
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 100,
          }}
        >
          <span style={{ width: 8, height: 8, background: 'white', borderRadius: '50%' }} />
          Display aktiv
        </div>
      )}
    </>
  );
}
