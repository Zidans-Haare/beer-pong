
/**
 * Calculates the estimated duration of a tournament in minutes.
 * @param type The tournament type (SINGLE_ELIMINATION, ROUND_ROBIN, GROUPS).
 * @param playerCount Number of players/teams.
 * @param tableCount Number of available tables (default 1).
 * @param matchDurationMinutes Duration of one match in minutes (default 12).
 * @param hasReturnLeg Whether there is a return leg (doubles matches).
 */
export function calculateTournamentDuration(
    type: string,
    playerCount: number,
    tableCount: number = 1,
    matchDurationMinutes: number = 12,
    hasReturnLeg: boolean = false
): number {
    if (playerCount < 2) return 0;

    let totalMatches = 0;

    switch (type) {
        case 'SINGLE_ELIMINATION':
        case 'ELIMINATION':
            // N-1 matches
            totalMatches = playerCount - 1;
            break;
        case 'ROUND_ROBIN':
            // N * (N-1) / 2
            totalMatches = (playerCount * (playerCount - 1)) / 2;
            break;
        case 'GROUPS':
        case 'GROUP_AND_KNOCKOUT':
            // Estimate: Groups of 4?
            // If we assume groups of ~4.
            // 4 players -> 6 matches per group.
            // Then KO.
            // Simplified: Round Robin estimation usually works as an upper bound or slightly less.
            // Let's approximate as Round Robin for complexity, or N * 1.5?
            // Let's use a standard approximation: Group phase ~ 0.75 * Round Robin?
            // Actually, if groups are small (4), matches are fewer than full Round Robin.
            // Let's stick to a robust simple estimate for now: N * 2 matches?
            // Better: use Round Robin logic for groups (conservative) or just (N * (N-1) / 2) * 0.6
            // Let's use a explicit simulation for 4-player groups if possible, but for now:
            totalMatches = playerCount * 2; // Rough heuristic
            break;
        default:
            totalMatches = playerCount;
    }

    if (hasReturnLeg) {
        totalMatches *= 2;
    }

    // With multiple tables, matches are played in parallel.
    // Efficiency isn't 100%, let's say 90% efficiency.
    // Duration = (TotalMatches / TableCount) * Duration
    // However, rounds constrain parallelization (in Elimination).
    // In Elimination, depth is log2(N). You can't play Final before Semi is done.
    // Min duration = Rounds * Duration.
    // Max duration = TotalMatches * Duration (1 table).

    if (type === 'SINGLE_ELIMINATION' || type === 'ELIMINATION') {
        if (tableCount >= playerCount / 2) {
            // Maximum parallelization: Duration determined by rounds
            const rounds = Math.ceil(Math.log2(playerCount));
            return rounds * matchDurationMinutes * (hasReturnLeg ? 2 : 1);
        }
    }

    // Default sequential-ish calculation
    return Math.ceil(totalMatches / tableCount) * matchDurationMinutes;
}

export function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h} Std ${m > 0 ? `${m} Min` : ''}`;
    return `${m} Min`;
}

export function getEstimatedEndTime(durationMinutes: number): string {
    const now = new Date();
    const end = new Date(now.getTime() + durationMinutes * 60000);
    return end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
