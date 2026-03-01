// Pure utilities — no server/DB imports, safe for client components

export interface PlayerPaceStats {
  totalMatches: number;
  averageDuration: number;
  fastestMatch: number;
  slowestMatch: number;
  paceLabel: 'Blitzschnell' | 'Schnellspieler' | 'Normal' | 'Genießer' | 'Unbekannt';
  percentile?: number;
  globalAvgDuration?: number;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes === 0) {
    return `${secs}s`;
  }

  if (secs === 0) {
    return `${minutes} Min`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')} Min`;
}
