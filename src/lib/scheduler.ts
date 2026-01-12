
import { Match, Player } from "@prisma/client";

export interface ScheduledMatch extends Match {
    scheduledStart: Date;
    tableNumber: number;
    player1?: Player | null;
    player2?: Player | null;
}

/**
 * Calculates estimated start times for matches in a tournament.
 */
export function calculateSchedule(
    matches: any[],
    baseStartTime: Date,
    durationMin: number,
    tableCount: number
): ScheduledMatch[] {
    // 1. Filter out placeholder matches that are impossible to schedule yet?
    // Actually, we'll schedule everything to give a full overview.

    // Sort logic: 
    // - Stages: GROUP/LEAGUE first, then BRACKET/KNOCKOUT
    // - Rounds: lower rounds first
    // - Position: sequential
    const sortedMatches = [...matches].sort((a, b) => {
        const stageOrder: Record<string, number> = { 'GROUP_1': 0, 'GROUP_2': 0, 'GROUP': 0, 'LEAGUE': 0, 'BRACKET': 1, 'KNOCKOUT': 1 };
        const aOrder = stageOrder[a.stage] ?? 2;
        const bOrder = stageOrder[b.stage] ?? 2;

        if (aOrder !== bOrder) return aOrder - bOrder;
        if (a.round !== b.round) return a.round - b.round;
        return a.position - b.position;
    });

    const tableAvailableAt = new Array(tableCount).fill(new Date(baseStartTime));
    const scheduledMatches: ScheduledMatch[] = [];

    // Current time for reference
    const now = new Date();

    // We start scheduling from the tournament start time or "now", whichever is later for future matches.
    // For already played matches, we could use their updatedAt, but to keep the schedule consistent,
    // we'll "fill" the tables with them first or just skip them.
    // Let's schedule EVERYTHING but respect reality:

    for (const match of sortedMatches) {
        // Find table that is available earliest
        let earliestTableIdx = 0;
        for (let i = 1; i < tableCount; i++) {
            if (tableAvailableAt[i] < tableAvailableAt[earliestTableIdx]) {
                earliestTableIdx = i;
            }
        }

        let start: Date;

        if (match.isPlayed) {
            // For played matches, we just place them at the earliest possible slot 
            // but they don't necessarily reflect the exact past.
            // This preserves the "queue" order.
            start = new Date(tableAvailableAt[earliestTableIdx]);
        } else {
            // For upcoming matches, ensure we don't schedule them in the past if tournament is active
            const earliestPossible = tableAvailableAt[earliestTableIdx];
            start = earliestPossible < now ? new Date(now) : new Date(earliestPossible);
        }

        scheduledMatches.push({
            ...match,
            scheduledStart: start,
            tableNumber: earliestTableIdx + 1,
        });

        // Update table availability: Add duration
        tableAvailableAt[earliestTableIdx] = new Date(start.getTime() + durationMin * 60000);
    }

    return scheduledMatches;
}

export function getEstimatedWaitTime(scheduledMatches: ScheduledMatch[], playerId: string): { waitMin: number, startTime: Date, table: number, afterMatchIds: string[] } | null {
    const playerMatches = scheduledMatches.filter(m => !m.isPlayed && (m.player1Id === playerId || m.player2Id === playerId));
    if (playerMatches.length === 0) return null;

    const nextMatch = playerMatches[0];
    const now = new Date();
    const waitMin = Math.max(0, Math.floor((nextMatch.scheduledStart.getTime() - now.getTime()) / 60000));

    // Find which matches are on the same table before this one
    const matchesBefore = scheduledMatches.filter(m =>
        !m.isPlayed &&
        m.tableNumber === nextMatch.tableNumber &&
        m.scheduledStart < nextMatch.scheduledStart
    );

    return {
        waitMin,
        startTime: nextMatch.scheduledStart,
        table: nextMatch.tableNumber,
        afterMatchIds: matchesBefore.map(m => m.id)
    };
}
