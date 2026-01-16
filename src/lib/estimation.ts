
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

    let totalDuration = 0;

    if (type === 'SINGLE_ELIMINATION' || type === 'ELIMINATION') {
        // Round-based simulation is most accurate for Elimination
        let currentPlayers = playerCount;
        let matchDuration = matchDurationMinutes * (hasReturnLeg ? 2 : 1);

        while (currentPlayers > 1) {
            let matchesInRound = Math.floor(currentPlayers / 2);
            // Parallelism bottleneck: can only play matches on available tables
            let roundsToClearLevel = Math.ceil(matchesInRound / tableCount);
            totalDuration += roundsToClearLevel * matchDuration;

            // Advance winners + any byes
            currentPlayers = Math.ceil(currentPlayers / 2);
        }
        return totalDuration;
    }

    if (type === 'ROUND_ROBIN') {
        // Total matches = N * (N-1) / 2
        let totalMatches = (playerCount * (playerCount - 1)) / 2;
        if (hasReturnLeg) totalMatches *= 2;

        // Parallelism bottleneck 1: Table count
        // Parallelism bottleneck 2: Player count (can only play floor(N/2) matches at once)
        const maxParallelMatches = Math.min(tableCount, Math.floor(playerCount / 2));

        const parallelRounds = Math.ceil(totalMatches / maxParallelMatches);
        return parallelRounds * matchDurationMinutes;
    }

    if (type === 'GROUPS' || type === 'GROUP_AND_KNOCKOUT') {
        // Assume 2 groups (standard for this app's Group logic)
        const p1 = Math.floor(playerCount / 2);
        const p2 = playerCount - p1;
        const groupMatches = ((p1 * (p1 - 1)) / 2) + ((p2 * (p2 - 1)) / 2);

        // Group phase parallelism
        const maxParallelGroup = Math.min(tableCount, Math.floor(Math.max(p1, p2))); // Heuristic
        const groupDuration = Math.ceil(groupMatches / tableCount) * matchDurationMinutes;

        // Knockout phase: assuming Top 2 from each group -> Semi (2 matches) -> Final/3rd (2 matches)
        // 2 parallelizable stages
        const koDuration = 2 * matchDurationMinutes;

        return groupDuration + koDuration;
    }

    // Fallback
    return Math.ceil(playerCount / tableCount) * matchDurationMinutes;
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
