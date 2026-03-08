
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

    const tableAvailableAt = new Array(tableCount).fill(null).map(() => new Date(baseStartTime));
    const playerBusyUntil: Record<string, Date> = {};
    const scheduledMatches: ScheduledMatch[] = [];

    // Current time for reference
    const now = new Date();

    for (const match of sortedMatches) {
        const p1 = (match.player1Id || match.team1Id) as string | null;
        const p2 = (match.player2Id || match.team2Id) as string | null;

        // Find the table where both players are free earliest
        let bestTableIdx = 0;
        let bestStart = new Date(Math.max(
            tableAvailableAt[0].getTime(),
            p1 ? (playerBusyUntil[p1]?.getTime() ?? 0) : 0,
            p2 ? (playerBusyUntil[p2]?.getTime() ?? 0) : 0,
        ));

        for (let i = 1; i < tableCount; i++) {
            const candidateStart = new Date(Math.max(
                tableAvailableAt[i].getTime(),
                p1 ? (playerBusyUntil[p1]?.getTime() ?? 0) : 0,
                p2 ? (playerBusyUntil[p2]?.getTime() ?? 0) : 0,
            ));
            if (candidateStart < bestStart) {
                bestStart = candidateStart;
                bestTableIdx = i;
            }
        }

        let start: Date;
        if (match.isPlayed) {
            start = new Date(bestStart);
        } else {
            start = bestStart < now ? new Date(now) : new Date(bestStart);
        }

        scheduledMatches.push({
            ...match,
            scheduledStart: start,
            tableNumber: bestTableIdx + 1,
        });

        const endTime = new Date(start.getTime() + durationMin * 60000);
        tableAvailableAt[bestTableIdx] = endTime;
        if (p1) playerBusyUntil[p1] = endTime;
        if (p2) playerBusyUntil[p2] = endTime;
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
