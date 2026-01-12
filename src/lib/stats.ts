import { prisma } from '@/lib/prisma';
// import { Player, Match, Tournament } from '@prisma/client';

export interface PlayerStats {
    id: string;
    name: string;
    matchesPlayed: number;
    matchesWon: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
    cupDiff: number; // Total cups hit - Total cups received
    winRate: number;
    history: { date: string; timestamp: number; winRate: number; cupsHit: number; cupDiff: number }[];
}

export async function getAllPlayerStats(): Promise<PlayerStats[]> {
    const players = await prisma.player.findMany({
        include: {
            matchesAsPlayer1: {
                where: {
                    winnerId: { not: null },
                    tournament: { status: 'COMPLETED' }
                },
                include: { tournament: true }
            },
            matchesAsPlayer2: {
                where: {
                    winnerId: { not: null },
                    tournament: { status: 'COMPLETED' }
                },
                include: { tournament: true }
            },
            tournaments: {
                where: {
                    tournament: { status: 'COMPLETED' }
                },
                include: { tournament: true }
            },
            standings: {
                where: {
                    tournament: { status: 'COMPLETED' }
                },
                include: {
                    tournament: {
                        include: {
                            standings: {
                                orderBy: [
                                    { points: 'desc' },
                                    { goalDifference: 'desc' },
                                    { goalsFor: 'desc' }
                                ]
                            }
                        }
                    }
                }
            }
        }
    });

    return players.map((p: any) => {
        // combine matches and sort by date
        const allMatches = [
            ...p.matchesAsPlayer1.map((m: any) => ({ ...m, isP1: true })),
            ...p.matchesAsPlayer2.map((m: any) => ({ ...m, isP1: false }))
        ].sort((a: any, b: any) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

        let matchesWon = 0;
        let cupsHit = 0;
        let cupsReceived = 0;
        const history: { date: string; timestamp: number; winRate: number; cupsHit: number; cupDiff: number }[] = [];

        allMatches.forEach((m, index) => {
            const isWinner = m.winnerId === p.id;
            if (isWinner) matchesWon++;

            const myScore = m.isP1 ? m.score1 : m.score2;
            const oppScore = m.isP1 ? m.score2 : m.score1;

            cupsHit += myScore;
            cupsReceived += oppScore;

            history.push({
                date: new Date(m.updatedAt).toLocaleDateString(),
                timestamp: new Date(m.updatedAt).getTime(),
                winRate: Math.round((matchesWon / (index + 1)) * 100),
                cupsHit: cupsHit,
                cupDiff: cupsHit - cupsReceived
            });
        });

        const matchesPlayed = allMatches.length;

        // Count tournament wins (1st place finishes)
        let tournamentsWon = 0;

        // Method 1: Check standings (for Round-Robin and Group tournaments)
        p.standings.forEach((standing: any) => {
            // Check if this player is first in their tournament's standings
            const tournamentStandings = standing.tournament.standings;
            if (tournamentStandings.length > 0 && tournamentStandings[0].playerId === p.id) {
                tournamentsWon++;
            }
        });

        // Method 2: Check completed tournaments where this player won the final match (for Elimination tournaments)
        // Get all completed tournaments this player participated in
        const completedTournamentIds = new Set<string>();
        p.tournaments.forEach((tp: any) => {
            if (tp.tournament?.status === 'COMPLETED') {
                completedTournamentIds.add(tp.tournament.id);
            }
        });

        // For each completed tournament, check if player won the final/highest round match
        for (const tournamentId of completedTournamentIds) {
            // Skip if we already counted this tournament via standings
            const alreadyCounted = p.standings.some((s: any) => s.tournamentId === tournamentId);
            if (alreadyCounted) continue;

            // Find the highest round match in this tournament
            const tournamentMatches = [...p.matchesAsPlayer1, ...p.matchesAsPlayer2]
                .filter((m: any) => m.tournamentId === tournamentId && m.isPlayed);

            if (tournamentMatches.length === 0) continue;

            // Find the match with the highest round number (the final)
            const finalMatch = tournamentMatches.reduce((highest: any, current: any) =>
                (current.round > highest.round) ? current : highest
            );

            // If this player won the final match, they won the tournament
            if (finalMatch.winnerId === p.id) {
                tournamentsWon++;
            }
        }

        return {
            id: p.id,
            name: p.name,
            matchesPlayed,
            matchesWon,
            tournamentsPlayed: p.tournaments.length,
            tournamentsWon,
            cupDiff: cupsHit - cupsReceived,
            winRate: matchesPlayed > 0 ? (matchesWon / matchesPlayed) : 0,
            history
        };
    }).sort((a: any, b: any) => {
        // 1. Sort by tournament wins (trophies) - most important
        if (b.tournamentsWon !== a.tournamentsWon) return b.tournamentsWon - a.tournamentsWon;
        // 2. Sort by match wins
        if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
        // 3. Sort by cup difference as tie-breaker
        return b.cupDiff - a.cupDiff;
    });
}

export interface TournamentStanding {
    playerId: string;
    playerName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    points: number; // 3 for win, 0 for loss? Or just wins? Let's use Wins as points for now.
    cupDiff: number;
}

// Calculate standings based on match results
// Optionally filter by stage (e.g. 'GROUP_1', 'GROUP_2')
export async function getTournamentStandings(tournamentId: string, stage?: string): Promise<TournamentStanding[]> {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            matches: {
                where: {
                    winnerId: { not: null },
                    ...(stage ? { stage } : {})
                }
            },
            rsvps: {
                include: {
                    player: true,
                },
            },
        },
    });

    if (!tournament) return [];

    // If we are filtering by group, we should only consider players IN that group.
    // We can infer players from the matches or initial RSVPs.
    // However, RSVPs includes EVERYONE.
    // If a player has 0 matches in this stage, they should arguably not be in the table OR be in the table with 0 stats.
    // For 'GROUP_1', only players in group 1 should be listed.

    // Strategy:
    // 1. Calculate stats from matches found.
    // 2. Filter the resulting stats to only include players who actually played or were scheduled in this stage?
    //    Problem: If a player hasn't played a match yet (start of tournament), they won't appear?
    //    The current logic iterates over `tournament.rsvps` to initialize stats.
    //    This means ALL players are in the list.

    //    Fix: Find which players are "in" this stage.
    //    We can look at all matches (even pending ones) for this stage to find participant IDs.
    //    Then filter `tournament.rsvps` to only those IDs.

    // Let's fetch ALL matches for the stage (not just COMPLETED) to determine participation.
    const allStageMatches = await prisma.match.findMany({
        where: {
            tournamentId,
            ...(stage ? { stage } : {})
        },
        select: { player1Id: true, player2Id: true }
    });

    const participantIds = new Set<string>();
    allStageMatches.forEach((m: { player1Id: string | null, player2Id: string | null }) => {
        if (m.player1Id) participantIds.add(m.player1Id);
        if (m.player2Id) participantIds.add(m.player2Id);
    });

    // If no matches exist for this stage yet (rare/impossible if started), fallback to all?
    // No, if strictly 0 matches, empty table is fine or 0 participants.

    // Filter RSVPs
    const relevantRsvps = stage
        ? tournament.rsvps.filter((r: any) => participantIds.has(r.playerId))
        : tournament.rsvps;

    const statsMap = new Map<string, TournamentStanding>();

    // Initialize for all relevant players
    relevantRsvps.forEach((rsvp: any) => {
        if (rsvp.status === 'YES') { // Only include players who RSVP'd 'YES'
            statsMap.set(rsvp.playerId, {
                playerId: rsvp.playerId,
                playerName: rsvp.player.name,
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                cupDiff: 0,
                points: 0, // wins * 3
            });
        }
    });

    // Process completed matches (which were fetched in `tournament.matches`)
    tournament.matches.forEach((match: any) => {
        // ... same logic as before ...
        if (!match.player1Id || !match.player2Id) return;

        const p1Stats = statsMap.get(match.player1Id);
        const p2Stats = statsMap.get(match.player2Id);

        // Only process if both players are in our tracking map (which handles stage filtering implicitly)
        if (p1Stats && p2Stats) {
            p1Stats.matchesPlayed += 1;
            p2Stats.matchesPlayed += 1;

            const s1 = match.score1 || 0;
            const s2 = match.score2 || 0;

            p1Stats.cupDiff += (s1 - s2);
            p2Stats.cupDiff += (s2 - s1);

            if (match.winnerId === match.player1Id) {
                p1Stats.wins += 1;
                p1Stats.points += 3;
                p2Stats.losses += 1;
            } else if (match.winnerId === match.player2Id) {
                p2Stats.wins += 1;
                p2Stats.points += 3;
                p1Stats.losses += 1;
            }
        }
    });

    return Array.from(statsMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.cupDiff !== a.cupDiff) return b.cupDiff - a.cupDiff;
        // Tie-breaker: Head-to-head? Or just wins.
        return b.wins - a.wins;
    });
}
