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
    history: { date: string; timestamp: number; winRate: number; cupsHit: number; cupDiff: number; duration: number }[];
}

export type StatsPeriod = 'month' | 'last5' | 'year' | 'all';

export function getPeriodStartDate(period: StatsPeriod): Date | undefined {
    const now = new Date();
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    if (period === 'year') return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return undefined;
}

export async function getAllPlayerStats(onlyRanked = true, period: StatsPeriod = 'all'): Promise<PlayerStats[]> {
    const since = getPeriodStartDate(period);
    // For 'last5', fetch all and filter per-player afterwards
    const tournamentFilter = {
        status: 'COMPLETED',
        ...(onlyRanked ? { isRanked: true } : {}),
        ...(since ? { date: { gte: since } } : {}),
    };

    const players = await prisma.player.findMany({
        include: {
            matchesAsPlayer1: {
                where: {
                    winnerId: { not: null },
                    tournament: tournamentFilter
                },
                include: { tournament: true }
            },
            matchesAsPlayer2: {
                where: {
                    winnerId: { not: null },
                    tournament: tournamentFilter
                },
                include: { tournament: true }
            },
            tournaments: {
                where: {
                    tournament: tournamentFilter
                },
                include: { tournament: true }
            },
            standings: {
                where: {
                    tournament: tournamentFilter
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
        let allMatches = [
            ...p.matchesAsPlayer1.map((m: any) => ({ ...m, isP1: true })),
            ...p.matchesAsPlayer2.map((m: any) => ({ ...m, isP1: false }))
        ].sort((a: any, b: any) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

        // For 'last5': limit to the player's last 5 matches
        if (period === 'last5') {
            allMatches = allMatches.slice(-5);
        }

        let matchesWon = 0;
        let cupsHit = 0;
        let cupsReceived = 0;
        const history: { date: string; timestamp: number; winRate: number; cupsHit: number; cupDiff: number; duration: number }[] = [];

        allMatches.forEach((m, index) => {
            const isWinner = m.winnerId === p.id;
            if (isWinner) matchesWon++;

            const myScore = m.isP1 ? m.score1 : m.score2;
            const oppScore = m.isP1 ? m.score2 : m.score1;

            cupsHit += myScore;
            cupsReceived += oppScore;

            // Calculate duration in seconds
            // Priority: durationSeconds -> completedAt - startedAt -> 12 min default (720s)
            let duration = 0;
            if (m.durationSeconds) {
                duration = m.durationSeconds;
            } else if (m.completedAt && m.startedAt) {
                const start = new Date(m.startedAt).getTime();
                const end = new Date(m.completedAt).getTime();
                duration = Math.floor((end - start) / 1000);
            }

            // For the chart: only use real durations. 0 = no real data (will be filtered out in chart)
            if (duration < 60 || duration > 1800) duration = 0;

            history.push({
                date: new Date(m.updatedAt).toLocaleDateString(),
                timestamp: new Date(m.updatedAt).getTime(),
                winRate: Math.round((matchesWon / (index + 1)) * 100),
                cupsHit: cupsHit,
                cupDiff: cupsHit - cupsReceived,
                duration: duration
            });
        });

        const matchesPlayed = allMatches.length;

        // Count tournament wins (1st place finishes)
        let tournamentsWon = 0;

        // For last5: derive which tournaments appear in the last 5 matches
        const last5TournamentIds = period === 'last5'
            ? new Set(allMatches.map((m: any) => m.tournamentId))
            : null;

        const relevantTournaments = last5TournamentIds
            ? p.tournaments.filter((tp: any) => last5TournamentIds.has(tp.tournamentId))
            : p.tournaments;
        const relevantStandings = last5TournamentIds
            ? p.standings.filter((s: any) => last5TournamentIds.has(s.tournamentId))
            : p.standings;

        // Method 1: Check standings (for Round-Robin and Group tournaments)
        relevantStandings.forEach((standing: any) => {
            // Check if this player is first in their tournament's standings
            const tournamentStandings = standing.tournament.standings;
            if (tournamentStandings.length > 0 && tournamentStandings[0].playerId === p.id) {
                tournamentsWon++;
            }
        });

        // Method 2: Check completed tournaments where this player won the final match (for Elimination tournaments)
        // Get all completed tournaments this player participated in (via matches OR TournamentParticipant)
        const completedTournamentIds = new Set<string>(allMatches.map((m: any) => m.tournamentId));
        relevantTournaments.forEach((tp: any) => {
            if (tp.tournament?.status === 'COMPLETED') {
                completedTournamentIds.add(tp.tournament.id);
            }
        });

        // For each completed tournament, check if player won the final/highest round match
        for (const tournamentId of completedTournamentIds) {
            // Skip if we already counted this tournament via standings
            const alreadyCounted = relevantStandings.some((s: any) => s.tournamentId === tournamentId);
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
            tournamentsPlayed: completedTournamentIds.size,
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
// Calculate standings based on match results
// Optionally filter by stage (e.g. 'GROUP_1', 'GROUP_2')
export async function getTournamentStandings(tournamentId: string, stage?: string): Promise<TournamentStanding[]> {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            matches: {
                where: {
                    // For team mode, winnerTeamId might be set, or winnerId.
                    // But in our logic, one of them must be set.
                    // We check general completion.
                    OR: [
                        { winnerId: { not: null } },
                        { winnerTeamId: { not: null } }
                    ],
                    ...(stage ? { stage } : {})
                }
            },
            rsvps: {
                include: {
                    player: true,
                },
            },
            teams: {
                include: {
                    player1: true,
                    player2: true,
                    guest1: true,
                    guest2: true
                }
            }
        },
    });

    if (!tournament) return [];

    const statsMap = new Map<string, TournamentStanding>();
    const isTeamMode = tournament.mode === 'TEAM';

    // 1. Initialize Stats
    if (isTeamMode) {
        // In Team Mode, we track TEAMS, not players
        const teams = tournament.teams;
        teams.forEach(team => {
            // Helper to get display name
            const getName = () => {
                if (team.name) return team.name;
                const m1 = team.player1?.name || team.guest1?.name;
                const m2 = team.player2?.name || team.guest2?.name;
                if (m1 && m2) return `${m1} & ${m2}`;
                if (m1) return m1;
                return m2 || 'Team';
            };

            statsMap.set(team.id, {
                playerId: team.id, // Using Team ID here
                playerName: getName(),
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                cupDiff: 0,
                points: 0,
            });
        });
    } else {
        // Solo Mode (existing logic)
        // Filter RSVPs
        // For stage filtering, we must check participation
        let relevantRsvps = tournament.rsvps;

        if (stage) {
            const allStageMatches = await prisma.match.findMany({
                where: { tournamentId, stage },
                select: { player1Id: true, player2Id: true }
            });
            const participantIds = new Set<string>();
            allStageMatches.forEach(m => {
                if (m.player1Id) participantIds.add(m.player1Id);
                if (m.player2Id) participantIds.add(m.player2Id);
            });
            relevantRsvps = tournament.rsvps.filter(r => participantIds.has(r.playerId));
        }

        relevantRsvps.forEach((rsvp: any) => {
            if (rsvp.status === 'YES') {
                statsMap.set(rsvp.playerId, {
                    playerId: rsvp.playerId,
                    playerName: rsvp.player.name,
                    matchesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    cupDiff: 0,
                    points: 0,
                });
            }
        });

        // Collect player IDs from matches that aren't in statsMap (e.g. guests)
        const missingPlayerIds = new Set<string>();
        tournament.matches.forEach((match: any) => {
            if (match.player1Id && !statsMap.has(match.player1Id)) missingPlayerIds.add(match.player1Id);
            if (match.player2Id && !statsMap.has(match.player2Id)) missingPlayerIds.add(match.player2Id);
        });

        if (missingPlayerIds.size > 0) {
            const missingPlayers = await prisma.player.findMany({
                where: { id: { in: Array.from(missingPlayerIds) } },
                select: { id: true, name: true }
            });
            missingPlayers.forEach(p => {
                statsMap.set(p.id, {
                    playerId: p.id,
                    playerName: p.name,
                    matchesPlayed: 0, wins: 0, losses: 0, cupDiff: 0, points: 0,
                });
            });
        }
    }

    // 2. Process Matches
    tournament.matches.forEach((match: any) => {
        if (isTeamMode) {
            // Team Logic
            if (!match.team1Id || !match.team2Id) return;
            const t1Stats = statsMap.get(match.team1Id);
            const t2Stats = statsMap.get(match.team2Id);

            if (t1Stats && t2Stats) {
                t1Stats.matchesPlayed += 1;
                t2Stats.matchesPlayed += 1;

                const s1 = match.score1 || 0;
                const s2 = match.score2 || 0;

                t1Stats.cupDiff += (s1 - s2);
                t2Stats.cupDiff += (s2 - s1);

                if (match.winnerTeamId === match.team1Id) {
                    t1Stats.wins += 1;
                    t1Stats.points += 3;
                    t2Stats.losses += 1;
                } else if (match.winnerTeamId === match.team2Id) {
                    t2Stats.wins += 1;
                    t2Stats.points += 3;
                    t1Stats.losses += 1;
                }
            }

        } else {
            // Solo Logic
            if (!match.player1Id || !match.player2Id) return;

            const p1Stats = statsMap.get(match.player1Id);
            const p2Stats = statsMap.get(match.player2Id);

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
        }
    });

    return Array.from(statsMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.cupDiff !== a.cupDiff) return b.cupDiff - a.cupDiff;
        return b.wins - a.wins;
    });
}
