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
    goldMedals: number;
    silverMedals: number;
    bronzeMedals: number;
}

export interface PlayerMedals {
    gold: number;
    silver: number;
    bronze: number;
}

export async function getPlayerMedals(onlyRanked = true): Promise<Record<string, PlayerMedals>> {
    const tournaments = await prisma.tournament.findMany({
        where: {
            status: 'COMPLETED',
            OR: [
                { isHistorical: true },
                ...(onlyRanked ? [{ isRanked: true, isHistorical: false }] : [{ isHistorical: false }]),
            ],
        },
        include: {
            matches: {
                where: { isPlayed: true },
                include: {
                    team1: { include: { player1: { select: { id: true } }, player2: { select: { id: true } } } },
                    team2: { include: { player1: { select: { id: true } }, player2: { select: { id: true } } } },
                },
                orderBy: { round: 'asc' },
            },
        },
    });

    const medals: Record<string, PlayerMedals> = {};

    const add = (ids: (string | null | undefined)[], type: keyof PlayerMedals) => {
        for (const id of ids) {
            if (!id) continue;
            if (!medals[id]) medals[id] = { gold: 0, silver: 0, bronze: 0 };
            medals[id][type]++;
        }
    };

    const teamPlayerIds = (team: any): string[] =>
        [team?.player1?.id, team?.player2?.id].filter(Boolean);

    for (const t of tournaments) {
        const isTeam = t.mode === 'TEAM';
        const isRR = t.type === 'ROUND_ROBIN' || t.type === 'GROUPS';

        if (isRR && !isTeam) {
            const bracketMatches = (t.matches as any[]).filter((m: any) => m.stage === 'BRACKET');

            if (bracketMatches.length > 0) {
                // RR with playoffs: medals from bracket final, not points table
                const maxBracketRound = Math.max(...bracketMatches.map((m: any) => m.round));
                const finalRoundMatches = bracketMatches.filter((m: any) => m.round === maxBracketRound);

                if (maxBracketRound > 1) {
                    // Distinguish final (semi-winners) from 3rd place match (semi-losers)
                    const semiMatches = bracketMatches.filter((m: any) => m.round === maxBracketRound - 1);
                    const semiWinnerIds = new Set(semiMatches.map((m: any) => m.winnerId).filter(Boolean));

                    for (const match of finalRoundMatches as any[]) {
                        if (!match.winnerId) continue;
                        const loserId = match.player1Id !== match.winnerId ? match.player1Id : match.player2Id;
                        const isFinal = semiWinnerIds.has(match.player1Id) && semiWinnerIds.has(match.player2Id);
                        if (isFinal) {
                            add([match.winnerId], 'gold');
                            add([loserId], 'silver');
                        } else {
                            add([match.winnerId], 'bronze');
                        }
                    }
                } else {
                    for (const match of finalRoundMatches as any[]) {
                        if (!match.winnerId) continue;
                        add([match.winnerId], 'gold');
                        const loserId = match.player1Id !== match.winnerId ? match.player1Id : match.player2Id;
                        add([loserId], 'silver');
                    }
                }
            } else {
                // Pure round-robin (no bracket): compute live from match results
                const liveMap = new Map<string, { playerId: string; points: number; cupDiff: number; wins: number }>();
                for (const m of t.matches as any[]) {
                    if (!m.player1Id || !m.player2Id || !m.winnerId) continue;
                    if (!liveMap.has(m.player1Id)) liveMap.set(m.player1Id, { playerId: m.player1Id, points: 0, cupDiff: 0, wins: 0 });
                    if (!liveMap.has(m.player2Id)) liveMap.set(m.player2Id, { playerId: m.player2Id, points: 0, cupDiff: 0, wins: 0 });
                    const p1 = liveMap.get(m.player1Id)!;
                    const p2 = liveMap.get(m.player2Id)!;
                    const s1 = m.score1 || 0;
                    const s2 = m.score2 || 0;
                    p1.cupDiff += s1 - s2;
                    p2.cupDiff += s2 - s1;
                    if (m.winnerId === m.player1Id) { p1.points += 3; p1.wins++; }
                    else { p2.points += 3; p2.wins++; }
                }
                const s = Array.from(liveMap.values()).sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.cupDiff !== a.cupDiff) return b.cupDiff - a.cupDiff;
                    return b.wins - a.wins;
                });
                if (s[0]) add([s[0].playerId], 'gold');
                if (s[1]) add([s[1].playerId], 'silver');
                if (s[2]) add([s[2].playerId], 'bronze');
            }
        } else {
            // Elimination (solo or team): derive from match results
            const played = t.matches;
            if (played.length === 0) continue;
            const maxRound = Math.max(...played.map((m: any) => m.round));
            const finals = played.filter((m: any) => m.round === maxRound);

            for (const final of finals as any[]) {
                if (isTeam) {
                    if (!final.winnerTeamId) continue;
                    const winTeam = final.team1Id === final.winnerTeamId ? final.team1 : final.team2;
                    const loseTeam = final.team1Id === final.winnerTeamId ? final.team2 : final.team1;
                    add(teamPlayerIds(winTeam), 'gold');
                    add(teamPlayerIds(loseTeam), 'silver');
                } else {
                    add([final.winnerId], 'gold');
                    const loserId = final.player1Id !== final.winnerId ? final.player1Id : final.player2Id;
                    add([loserId], 'silver');
                }
            }

            // Bronze = semi-final losers (maxRound - 1), only if there's a semi
            if (maxRound > 1) {
                const semis = played.filter((m: any) => m.round === maxRound - 1) as any[];
                for (const semi of semis) {
                    if (isTeam) {
                        if (!semi.winnerTeamId) continue;
                        const loseTeam = semi.team1Id === semi.winnerTeamId ? semi.team2 : semi.team1;
                        add(teamPlayerIds(loseTeam), 'bronze');
                    } else {
                        const loserId = semi.player1Id !== semi.winnerId ? semi.player1Id : semi.player2Id;
                        add([loserId], 'bronze');
                    }
                }
            }
        }
    }

    return medals;
}

export type StatsPeriod = 'month' | 'last5' | 'year' | 'all';

export function getPeriodStartDate(period: StatsPeriod): Date | undefined {
    const now = new Date();
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    if (period === 'year') return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return undefined;
}

export async function getAllPlayerStats(onlyRanked = true, period: StatsPeriod = 'all', medals?: Record<string, PlayerMedals>): Promise<PlayerStats[]> {
    if (!medals) medals = await getPlayerMedals(onlyRanked);
    const since = getPeriodStartDate(period);
    // For 'last5', fetch all and filter per-player afterwards
    const tournamentFilter = {
        status: 'COMPLETED',
        isHistorical: false,
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

        // Group matches by tournament so each chart data point = one tournament event
        const tournamentGroups = new Map<string, { date: Date; matches: typeof allMatches }>();
        for (const m of allMatches) {
            if (!tournamentGroups.has(m.tournamentId)) {
                tournamentGroups.set(m.tournamentId, {
                    date: new Date(m.tournament.date),
                    matches: [],
                });
            }
            tournamentGroups.get(m.tournamentId)!.matches.push(m);
        }
        const sortedGroups = Array.from(tournamentGroups.values())
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        let matchesWon = 0;
        let cupsHit = 0;
        let cupsReceived = 0;
        let totalMatchCount = 0;
        const history: { date: string; timestamp: number; winRate: number; cupsHit: number; cupDiff: number; duration: number }[] = [];

        for (const group of sortedGroups) {
            const groupDurations: number[] = [];
            for (const m of group.matches) {
                totalMatchCount++;
                if (m.winnerId === p.id) matchesWon++;
                cupsHit += m.isP1 ? (m.score1 || 0) : (m.score2 || 0);
                cupsReceived += m.isP1 ? (m.score2 || 0) : (m.score1 || 0);

                let duration = 0;
                if (m.durationSeconds) {
                    duration = m.durationSeconds;
                } else if (m.completedAt && m.startedAt) {
                    duration = Math.floor((new Date(m.completedAt).getTime() - new Date(m.startedAt).getTime()) / 1000);
                }
                if (duration >= 60 && duration <= 1800) groupDurations.push(duration);
            }
            history.push({
                date: group.date.toLocaleDateString(),
                timestamp: group.date.getTime(),
                winRate: Math.round((matchesWon / totalMatchCount) * 100),
                cupsHit,
                cupDiff: cupsHit - cupsReceived,
                duration: groupDurations.length > 0
                    ? Math.round(groupDurations.reduce((a, b) => a + b, 0) / groupDurations.length)
                    : 0,
            });
        }

        const matchesPlayed = totalMatchCount;

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

        const m = medals![p.id] ?? { gold: 0, silver: 0, bronze: 0 };
        return {
            id: p.id,
            name: p.name,
            matchesPlayed,
            matchesWon,
            tournamentsPlayed: completedTournamentIds.size,
            tournamentsWon,
            cupDiff: cupsHit - cupsReceived,
            winRate: matchesPlayed > 0 ? (matchesWon / matchesPlayed) : 0,
            history,
            goldMedals: m.gold,
            silverMedals: m.silver,
            bronzeMedals: m.bronze,
        };
    }).sort((a: any, b: any) => {
        // Medal ranking: gold → silver → bronze → match wins → cup diff
        if (b.goldMedals !== a.goldMedals) return b.goldMedals - a.goldMedals;
        if (b.silverMedals !== a.silverMedals) return b.silverMedals - a.silverMedals;
        if (b.bronzeMedals !== a.bronzeMedals) return b.bronzeMedals - a.bronzeMedals;
        if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
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
