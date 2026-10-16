'use client';

import { useTournamentWakeLock } from '@/hooks/useWakeLock';

interface TournamentClientFeaturesProps {
  tournamentId: string;
  tournamentStatus: string;
  // bleibt für Aufrufer erhalten; alle drei Plätze werden gleich gefeiert
  isWinner?: boolean;
}

export default function TournamentClientFeatures({
  tournamentStatus,
}: TournamentClientFeaturesProps) {
  const isRunning = tournamentStatus === 'ACTIVE';

  // Wake lock for active tournaments
  const wakeLock = useTournamentWakeLock(isRunning);

  return (
    <>
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
            boxShadow: "none",
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
