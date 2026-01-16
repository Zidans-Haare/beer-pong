/**
 * Smart Duration Tracking Service
 *
 * Tracks match durations and provides predictions based on:
 * 1. Historic matchup data (Player A vs Player B)
 * 2. Combined player averages
 * 3. Global baseline fallback
 */

import { prisma } from './prisma';

// Default baseline duration in seconds (12 minutes)
const DEFAULT_DURATION_SECONDS = 12 * 60;

// Minimum matches needed for reliable stats
const MIN_MATCHES_FOR_STATS = 3;

// Weight for historic matchup vs player average (0-1)
const HISTORIC_MATCHUP_WEIGHT = 0.7;

export interface DurationPrediction {
  predictedSeconds: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'historic_matchup' | 'player_average' | 'global_baseline';
  details?: {
    historicMatchups?: number;
    player1Avg?: number;
    player2Avg?: number;
    globalAvg?: number;
  };
}

export interface PlayerPaceStats {
  totalMatches: number;
  averageDuration: number;
  fastestMatch: number;
  slowestMatch: number;
  paceLabel: 'Blitzschnell' | 'Schnellspieler' | 'Normal' | 'Genießer' | 'Unbekannt';
  percentile?: number; // How fast compared to others (0-100, lower = faster)
}

/**
 * Get duration prediction for a match between two players
 */
export async function getPrediction(
  player1Id: string | null,
  player2Id: string | null
): Promise<DurationPrediction> {
  // If either player is TBD, use global baseline
  if (!player1Id || !player2Id) {
    const globalAvg = await getGlobalAverageDuration();
    return {
      predictedSeconds: globalAvg || DEFAULT_DURATION_SECONDS,
      confidence: 'low',
      source: 'global_baseline',
      details: { globalAvg: globalAvg ?? undefined },
    };
  }

  // Try historic matchup first
  const historicAvg = await getHistoricMatchupDuration(player1Id, player2Id);
  if (historicAvg) {
    return {
      predictedSeconds: historicAvg.avgDuration,
      confidence: historicAvg.matchCount >= 5 ? 'high' : 'medium',
      source: 'historic_matchup',
      details: {
        historicMatchups: historicAvg.matchCount,
      },
    };
  }

  // Try player averages
  const player1Avg = await getPlayerAverageDuration(player1Id);
  const player2Avg = await getPlayerAverageDuration(player2Id);

  if (player1Avg || player2Avg) {
    const combinedAvg = player1Avg && player2Avg
      ? (player1Avg + player2Avg) / 2
      : player1Avg || player2Avg || DEFAULT_DURATION_SECONDS;

    return {
      predictedSeconds: Math.round(combinedAvg),
      confidence: player1Avg && player2Avg ? 'medium' : 'low',
      source: 'player_average',
      details: {
        player1Avg: player1Avg ?? undefined,
        player2Avg: player2Avg ?? undefined,
      },
    };
  }

  // Fallback to global baseline
  const globalAvg = await getGlobalAverageDuration();
  return {
    predictedSeconds: globalAvg || DEFAULT_DURATION_SECONDS,
    confidence: 'low',
    source: 'global_baseline',
    details: { globalAvg: globalAvg ?? undefined },
  };
}

/**
 * Get historic duration average for specific matchup (A vs B)
 */
async function getHistoricMatchupDuration(
  player1Id: string,
  player2Id: string
): Promise<{ avgDuration: number; matchCount: number } | null> {
  const matches = await prisma.match.findMany({
    where: {
      durationSeconds: { not: null },
      OR: [
        { player1Id, player2Id },
        { player1Id: player2Id, player2Id: player1Id },
      ],
    },
    select: { durationSeconds: true },
  });

  if (matches.length < MIN_MATCHES_FOR_STATS) {
    return null;
  }

  const totalDuration = matches.reduce((sum, m) => sum + (m.durationSeconds || 0), 0);
  return {
    avgDuration: Math.round(totalDuration / matches.length),
    matchCount: matches.length,
  };
}

/**
 * Get average duration for a single player
 */
async function getPlayerAverageDuration(playerId: string): Promise<number | null> {
  const matches = await prisma.match.findMany({
    where: {
      durationSeconds: { not: null },
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
    select: { durationSeconds: true },
  });

  if (matches.length < MIN_MATCHES_FOR_STATS) {
    return null;
  }

  const totalDuration = matches.reduce((sum, m) => sum + (m.durationSeconds || 0), 0);
  return Math.round(totalDuration / matches.length);
}

/**
 * Get global average duration across all matches (internal)
 */
async function getGlobalAverageDuration(): Promise<number | null> {
  const result = await prisma.match.aggregate({
    where: { durationSeconds: { not: null } },
    _avg: { durationSeconds: true },
    _count: { durationSeconds: true },
  });

  if (!result._count.durationSeconds || result._count.durationSeconds < MIN_MATCHES_FOR_STATS) {
    return null;
  }

  return Math.round(result._avg.durationSeconds || DEFAULT_DURATION_SECONDS);
}

export interface GlobalDurationStats {
  averageSeconds: number;
  averageMinutes: number;
  matchCount: number;
  isCalculated: boolean; // true if based on real data, false if using default
}

/**
 * Get global duration statistics for display/admin
 */
export async function getGlobalDurationStats(): Promise<GlobalDurationStats> {
  const result = await prisma.match.aggregate({
    where: { durationSeconds: { not: null } },
    _avg: { durationSeconds: true },
    _count: { durationSeconds: true },
  });

  const matchCount = result._count.durationSeconds || 0;
  const hasEnoughData = matchCount >= MIN_MATCHES_FOR_STATS;

  const averageSeconds = hasEnoughData && result._avg.durationSeconds
    ? Math.round(result._avg.durationSeconds)
    : DEFAULT_DURATION_SECONDS;

  return {
    averageSeconds,
    averageMinutes: Math.round(averageSeconds / 60),
    matchCount,
    isCalculated: hasEnoughData,
  };
}

/**
 * Get detailed pace statistics for a player
 * Only considers ranked tournaments (Liga-Turniere)
 */
export async function getPlayerPaceStats(playerId: string): Promise<PlayerPaceStats> {
  const matches = await prisma.match.findMany({
    where: {
      durationSeconds: { not: null },
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
      tournament: { isRanked: true }, // Only ranked tournaments
    },
    select: { durationSeconds: true },
    orderBy: { durationSeconds: 'asc' },
  });

  if (matches.length === 0) {
    return {
      totalMatches: 0,
      averageDuration: 0,
      fastestMatch: 0,
      slowestMatch: 0,
      paceLabel: 'Unbekannt',
    };
  }

  const durations = matches.map((m) => m.durationSeconds!);
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  const avgDuration = totalDuration / durations.length;

  // Get global average for comparison
  const globalAvg = (await getGlobalAverageDuration()) || DEFAULT_DURATION_SECONDS;

  // Calculate percentile (how fast compared to global)
  const percentile = Math.round((avgDuration / globalAvg) * 50);

  // Determine pace label
  let paceLabel: PlayerPaceStats['paceLabel'];
  if (avgDuration < globalAvg * 0.7) {
    paceLabel = 'Blitzschnell';
  } else if (avgDuration < globalAvg * 0.9) {
    paceLabel = 'Schnellspieler';
  } else if (avgDuration < globalAvg * 1.1) {
    paceLabel = 'Normal';
  } else {
    paceLabel = 'Genießer';
  }

  return {
    totalMatches: matches.length,
    averageDuration: Math.round(avgDuration),
    fastestMatch: durations[0],
    slowestMatch: durations[durations.length - 1],
    paceLabel,
    percentile: Math.min(100, Math.max(0, percentile)),
  };
}

/**
 * Get tournament time forecast
 */
export async function getTournamentForecast(tournamentId: string): Promise<{
  estimatedEndTime: Date;
  remainingMatches: number;
  avgMatchDuration: number;
  totalRemainingMinutes: number;
}> {
  // Get remaining matches
  const remainingMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      winnerId: null,
      player1Id: { not: null },
      player2Id: { not: null },
    },
    include: {
      player1: { select: { id: true } },
      player2: { select: { id: true } },
    },
  });

  if (remainingMatches.length === 0) {
    return {
      estimatedEndTime: new Date(),
      remainingMatches: 0,
      avgMatchDuration: 0,
      totalRemainingMinutes: 0,
    };
  }

  // Get predictions for each remaining match
  const predictions = await Promise.all(
    remainingMatches.map((m) => getPrediction(m.player1Id, m.player2Id))
  );

  const totalSeconds = predictions.reduce((sum, p) => sum + p.predictedSeconds, 0);
  const avgDuration = Math.round(totalSeconds / predictions.length);

  // Estimate end time (assuming sequential play with some overlap)
  const parallelFactor = 0.8; // Assume some matches can overlap
  const adjustedTotalSeconds = totalSeconds * parallelFactor;

  const estimatedEndTime = new Date(Date.now() + adjustedTotalSeconds * 1000);

  return {
    estimatedEndTime,
    remainingMatches: remainingMatches.length,
    avgMatchDuration: avgDuration,
    totalRemainingMinutes: Math.round(adjustedTotalSeconds / 60),
  };
}

/**
 * Record match duration when result is submitted
 */
export async function recordMatchDuration(
  matchId: string,
  startedAt?: Date
): Promise<void> {
  const now = new Date();

  // Calculate duration if we have a start time
  let durationSeconds: number | undefined;
  if (startedAt) {
    durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

    // Sanity check: ignore unrealistic durations (< 1 min or > 60 min)
    if (durationSeconds < 60 || durationSeconds > 3600) {
      durationSeconds = undefined;
    }
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      completedAt: now,
      durationSeconds,
    },
  });
}

/**
 * Mark a match as started (when it becomes playable)
 */
export async function markMatchStarted(matchId: string): Promise<void> {
  await prisma.match.update({
    where: { id: matchId },
    data: {
      startedAt: new Date(),
    },
  });
}

/**
 * Format duration for display
 */
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

/**
 * Get pace emoji based on duration
 */
export function getPaceEmoji(paceLabel: PlayerPaceStats['paceLabel']): string {
  switch (paceLabel) {
    case 'Blitzschnell':
      return '⚡';
    case 'Schnellspieler':
      return '🏃';
    case 'Normal':
      return '🚶';
    case 'Genießer':
      return '🐢';
    default:
      return '❓';
  }
}
