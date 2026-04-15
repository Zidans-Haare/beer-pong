import { prisma } from "@/lib/prisma";
import {
    generateSingleEliminationBracket,
    generateRoundRobinMatches,
    generateGroupStageMatches
} from "@/lib/brackets";
import { markMatchStarted } from "@/lib/duration";

export class TournamentService {
    /**
     * Starts a tournament by setting status to ACTIVE and generating initial matches.
     * Supports both registered players (via RSVPs) and guests (for Spaß-Turniere).
     */
    static async startTournament(tournamentId: string) {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                rsvps: {
                    where: { status: 'YES' },
                    include: { player: true }
                },
                guests: {
                    where: { expiresAt: { gt: new Date() } }
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

        if (!tournament) throw new Error("Tournament not found");

        // TEAM MODE: Use teams instead of individual players
        if (tournament.mode === 'TEAM') {
            const teams = tournament.teams;
            
            if (teams.length < 2) {
                throw new Error("Mindestens 2 Teams erforderlich für Team-Modus.");
            }

            // Generate matches using team IDs
            let matches: any[] = [];
            const teamIds = teams.map(t => ({ id: t.id }));

            if (tournament.type === "SINGLE_ELIMINATION" || tournament.type === "ELIMINATION") {
                matches = this.generateTeamBracket(tournamentId, teamIds);
            } else if (tournament.type === "GROUP_AND_KNOCKOUT" || tournament.type === "GROUPS") {
                if (teams.length < 4) {
                    throw new Error("Gruppenphasen-Turniere benötigen mindestens 4 Teams. Verwende stattdessen 'Jeder gegen Jeden' oder 'K.O.-System'.");
                }
                matches = this.generateTeamGroupMatches(tournamentId, teams.map(t => t.id), tournament.hasReturnLeg);
            } else if (tournament.type === "ROUND_ROBIN") {
                matches = this.generateTeamRoundRobin(tournamentId, teams.map(t => t.id), tournament.hasReturnLeg);
            }

            // Save Team Matches (with team1Id/team2Id)
            if (matches.length > 0) {
                await prisma.match.createMany({
                    data: matches.map(m => ({
                        tournamentId: m.tournamentId,
                        team1Id: m.team1Id,
                        team2Id: m.team2Id,
                        round: m.round,
                        position: m.position,
                        stage: m.stage,
                        isPlayed: m.isPlayed || false,
                        winnerTeamId: m.winnerTeamId || null
                    }))
                });
            }

            // Update status
            await prisma.tournament.update({
                where: { id: tournamentId },
                data: { status: "ACTIVE" },
            });

            // Mark all playable matches as started
            const playableMatches = await prisma.match.findMany({
                where: {
                    tournamentId,
                    isPlayed: false,
                    team1Id: { not: null },
                    team2Id: { not: null }
                }
            });

            const tc1 = tournament.tableCount || 1;
            for (let i = 0; i < playableMatches.length; i++) {
                await markMatchStarted(playableMatches[i].id, (i % tc1) + 1);
            }

            return;
        }

        // SOLO MODE: Original logic using player IDs
        // Collect all participants
        const playerIds: string[] = tournament.rsvps.map(p => p.playerId);

        // For guests in Spaß-Turniere, create temporary player records
        const guestPlayerIds: string[] = [];
        if (tournament.guests.length > 0) {
            for (const guest of tournament.guests) {
                // Check if a player with this guest's name already exists (reuse if possible)
                // Or create a new "guest" player entry
                let guestPlayer = await prisma.player.findFirst({
                    where: {
                        name: guest.name,
                        isGuest: true
                    }
                });

                if (!guestPlayer) {
                    guestPlayer = await prisma.player.create({
                        data: {
                            name: guest.name,
                            isGuest: true
                        }
                    });
                }

                guestPlayerIds.push(guestPlayer.id);
            }
        }

        // Combine all participant IDs
        const allPlayerIds = [...playerIds, ...guestPlayerIds];

        if (allPlayerIds.length < 2) {
            throw new Error("Mindestens 2 Teilnehmer erforderlich (Spieler oder Gäste).");
        }

        // Sync participants for consistency
        for (const pid of allPlayerIds) {
            await prisma.tournamentParticipant.upsert({
                where: { tournamentId_playerId: { tournamentId, playerId: pid } },
                update: {},
                create: { tournamentId, playerId: pid }
            });
        }

        let matches: any[] = [];
        const players = allPlayerIds.map(id => ({ id }));

        if (tournament.type === "SINGLE_ELIMINATION" || tournament.type === "ELIMINATION") {
            matches = generateSingleEliminationBracket(tournamentId, players);
        } else if (tournament.type === "GROUP_AND_KNOCKOUT" || tournament.type === "GROUPS") {
            if (allPlayerIds.length < 4) {
                throw new Error("Gruppenphasen-Turniere benötigen mindestens 4 Teilnehmer. Verwende stattdessen 'Jeder gegen Jeden' oder 'K.O.-System'.");
            }

            matches = generateGroupStageMatches(tournamentId, allPlayerIds, tournament.hasReturnLeg);
        } else if (tournament.type === "ROUND_ROBIN") {
            matches = generateRoundRobinMatches(tournamentId, allPlayerIds, tournament.hasReturnLeg);

            // Create Standings for League
            for (const pid of allPlayerIds) {
                await prisma.tournamentStanding.upsert({
                    where: { tournamentId_playerId: { tournamentId, playerId: pid } },
                    update: {},
                    create: { tournamentId, playerId: pid, groupId: 0 }
                });
            }
        }

        // Handle Standings for Groups
        if (tournament.type === "GROUPS" || tournament.type === "GROUP_AND_KNOCKOUT") {
            const group1Players = new Set<string>();
            const group2Players = new Set<string>();

            matches.forEach(m => {
                if (m.stage === 'GROUP_1') {
                    if (m.player1Id) group1Players.add(m.player1Id);
                    if (m.player2Id) group1Players.add(m.player2Id);
                } else if (m.stage === 'GROUP_2') {
                    if (m.player1Id) group2Players.add(m.player1Id);
                    if (m.player2Id) group2Players.add(m.player2Id);
                }
            });

            for (const pid of group1Players) {
                await prisma.tournamentStanding.upsert({
                    where: { tournamentId_playerId: { tournamentId, playerId: pid } },
                    update: { groupId: 1 },
                    create: { tournamentId, playerId: pid, groupId: 1 }
                });
            }
            for (const pid of group2Players) {
                await prisma.tournamentStanding.upsert({
                    where: { tournamentId_playerId: { tournamentId, playerId: pid } },
                    update: { groupId: 2 },
                    create: { tournamentId, playerId: pid, groupId: 2 }
                });
            }
        }

        // Save Matches
        if (matches.length > 0) {
            await prisma.match.createMany({
                data: matches.map(m => ({
                    tournamentId: m.tournamentId,
                    player1Id: m.player1Id,
                    player2Id: m.player2Id,
                    round: m.round,
                    position: m.position,
                    stage: m.stage,
                    isPlayed: m.isPlayed || false,
                    winnerId: m.winnerId || null
                }))
            });
        }

        // Update status
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: "ACTIVE" },
        });

        // Handle Bye-Matches
        if (tournament.type === "SINGLE_ELIMINATION" || tournament.type === "ELIMINATION") {
            const byeMatches = await prisma.match.findMany({
                where: {
                    tournamentId,
                    stage: 'BRACKET',
                    isPlayed: true,
                    winnerId: { not: null }
                }
            });

            const { MatchService } = await import('./MatchService');
            for (const byeMatch of byeMatches) {
                if (byeMatch.winnerId) {
                    await MatchService.advanceWinner(
                        tournamentId,
                        byeMatch.round,
                        byeMatch.position,
                        byeMatch.winnerId
                    );
                }
            }
        }

        // Mark all playable matches as started
        const playableMatches = await prisma.match.findMany({
            where: {
                tournamentId,
                isPlayed: false,
                player1Id: { not: null },
                player2Id: { not: null }
            }
        });

        const tc2 = tournament.tableCount || 1;
        for (let i = 0; i < playableMatches.length; i++) {
            await markMatchStarted(playableMatches[i].id, (i % tc2) + 1);
        }
    }

    /**
     * Recalculates standings from scratch based on actual match results.
     * Fixes double-counting when match results are corrected.
     */
    static async recalculateStandings(tournamentId: string) {
        await prisma.tournamentStanding.updateMany({
            where: { tournamentId },
            data: { points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 }
        });

        const matches = await prisma.match.findMany({
            where: { tournamentId, isPlayed: true, player1Id: { not: null }, player2Id: { not: null } }
        });

        for (const m of matches) {
            const s1 = m.score1 ?? 0, s2 = m.score2 ?? 0;
            const p1 = m.player1Id!, p2 = m.player2Id!;
            if (s1 > s2) {
                await prisma.tournamentStanding.updateMany({ where: { tournamentId, playerId: p1 }, data: { played: { increment: 1 }, won: { increment: 1 }, points: { increment: 3 }, goalsFor: { increment: s1 }, goalsAgainst: { increment: s2 }, goalDifference: { increment: s1 - s2 } } });
                await prisma.tournamentStanding.updateMany({ where: { tournamentId, playerId: p2 }, data: { played: { increment: 1 }, lost: { increment: 1 }, goalsFor: { increment: s2 }, goalsAgainst: { increment: s1 }, goalDifference: { increment: s2 - s1 } } });
            } else if (s2 > s1) {
                await prisma.tournamentStanding.updateMany({ where: { tournamentId, playerId: p1 }, data: { played: { increment: 1 }, lost: { increment: 1 }, goalsFor: { increment: s1 }, goalsAgainst: { increment: s2 }, goalDifference: { increment: s1 - s2 } } });
                await prisma.tournamentStanding.updateMany({ where: { tournamentId, playerId: p2 }, data: { played: { increment: 1 }, won: { increment: 1 }, points: { increment: 3 }, goalsFor: { increment: s2 }, goalsAgainst: { increment: s1 }, goalDifference: { increment: s2 - s1 } } });
            } else {
                await prisma.tournamentStanding.updateMany({ where: { tournamentId, playerId: p1 }, data: { played: { increment: 1 }, drawn: { increment: 1 }, points: { increment: 1 }, goalsFor: { increment: s1 }, goalsAgainst: { increment: s2 } } });
                await prisma.tournamentStanding.updateMany({ where: { tournamentId, playerId: p2 }, data: { played: { increment: 1 }, drawn: { increment: 1 }, points: { increment: 1 }, goalsFor: { increment: s2 }, goalsAgainst: { increment: s1 } } });
            }
        }
    }

    /**
     * Generates Knockout phase (Bracket) from Group standings.
     */
    static async generateKnockoutFromGroups(tournamentId: string) {
        // Recalculate standings from actual match results before seeding
        await TournamentService.recalculateStandings(tournamentId);

        const standings = await prisma.tournamentStanding.findMany({
            where: { tournamentId },
            orderBy: [
                { groupId: 'asc' },
                { points: 'desc' },
                { goalDifference: 'desc' },
                { goalsFor: 'desc' }
            ]
        });

        const groups: Record<number, typeof standings> = {};
        standings.forEach(s => {
            if (!groups[s.groupId]) groups[s.groupId] = [];
            groups[s.groupId].push(s);
        });

        const qualified: { playerId: string, rank: number, groupId: number }[] = [];
        const groupIds = Object.keys(groups);
        const isRoundRobin = groupIds.length === 1 && groupIds[0] === '0';

        if (isRoundRobin) {
            // Round Robin: take top 4 for proper semis → final + 3rd place
            const group = groups[0];
            for (let i = 0; i < Math.min(4, group.length); i++) {
                qualified.push({ playerId: group[i].playerId, rank: i + 1, groupId: 0 });
            }
        } else {
            Object.values(groups).forEach(groupStandings => {
                if (groupStandings[0]) qualified.push({ playerId: groupStandings[0].playerId, rank: 1, groupId: groupStandings[0].groupId });
                if (groupStandings[1]) qualified.push({ playerId: groupStandings[1].playerId, rank: 2, groupId: groupStandings[1].groupId });
            });
        }

        if (qualified.length === 4) {
            const semi1 = await prisma.match.create({
                data: { tournamentId, player1Id: qualified[0].playerId, player2Id: qualified[3].playerId, round: 1, position: 0, stage: "BRACKET" }
            });
            const semi2 = await prisma.match.create({
                data: { tournamentId, player1Id: qualified[2].playerId, player2Id: qualified[1].playerId, round: 1, position: 1, stage: "BRACKET" }
            });

            await markMatchStarted(semi1.id);
            await markMatchStarted(semi2.id);

            await prisma.match.create({
                data: { tournamentId, player1Id: null, player2Id: null, round: 2, position: 0, stage: "BRACKET" }
            });

            await prisma.match.create({
                data: { tournamentId, player1Id: null, player2Id: null, round: 2, position: 1, stage: "BRACKET" }
            });
        } else {
            const createdMatches: string[] = [];
            for (let i = 0; i < qualified.length; i += 2) {
                if (qualified[i] && qualified[i + 1]) {
                    const match = await prisma.match.create({
                        data: { tournamentId, player1Id: qualified[i].playerId, player2Id: qualified[i + 1].playerId, round: 1, position: i / 2, stage: "BRACKET" }
                    });
                    createdMatches.push(match.id);
                }
            }

            for (const matchId of createdMatches) {
                await markMatchStarted(matchId);
            }

            const nextRoundMatches = Math.ceil(qualified.length / 4);
            for (let m = 0; m < nextRoundMatches; m++) {
                await prisma.match.create({
                    data: { tournamentId, player1Id: null, player2Id: null, round: 2, position: m, stage: "BRACKET" }
                });
            }
        }
    }

    /**
     * Generate bracket matches for team mode (using team IDs instead of player IDs)
     */
    private static generateTeamBracket(tournamentId: string, teams: { id: string }[]): any[] {
        // Shuffle teams
        const shuffled = [...teams];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const numTeams = shuffled.length;
        let size = 2;
        while (size < numTeams) size *= 2;

        if (size === 2) {
            return [{
                tournamentId, round: 1, position: 0, stage: 'BRACKET',
                team1Id: shuffled[0]?.id || null,
                team2Id: shuffled[1]?.id || null,
                isPlayed: false,
            }];
        }

        const matches: any[] = [];
        const rounds = Math.ceil(Math.log2(size));

        const byeCount = size - numTeams;
        const qualMatchCount = numTeams - size / 2;
        const r2Count = size / 4;

        const seedTeams = shuffled.slice(0, byeCount);
        const qualTeams = shuffled.slice(byeCount);

        // Qual match r1 positions: interleave seeds and qual winners in r2
        const qualR1Positions: number[] = [];
        for (let q = 0; q < qualMatchCount; q++) {
            qualR1Positions.push(q < r2Count ? 2 * q : 2 * (q - r2Count) + 1);
        }

        // Round 1: qualifying matches only (no byes)
        for (let q = 0; q < qualMatchCount; q++) {
            matches.push({
                tournamentId,
                round: 1,
                position: qualR1Positions[q],
                stage: 'BRACKET',
                team1Id: qualTeams[q]?.id || null,
                team2Id: qualTeams[2 * qualMatchCount - 1 - q]?.id || null,
                isPlayed: false,
            });
        }

        // Mark which r2 slots will receive a qual winner
        const coveredR2Slots = new Set<string>();
        for (let q = 0; q < qualMatchCount; q++) {
            const p = qualR1Positions[q];
            coveredR2Slots.add(`${Math.floor(p / 2)}-${p % 2 === 0 ? 't1' : 't2'}`);
        }

        // Round 2: pre-fill seed teams into uncovered slots
        let seedIdx = 0;
        for (let m = 0; m < r2Count; m++) {
            const t1Covered = coveredR2Slots.has(`${m}-t1`);
            const t2Covered = coveredR2Slots.has(`${m}-t2`);
            matches.push({
                tournamentId,
                round: 2,
                position: m,
                stage: 'BRACKET',
                team1Id: t1Covered ? null : (seedTeams[seedIdx++]?.id || null),
                team2Id: t2Covered ? null : (seedTeams[seedIdx++]?.id || null),
                isPlayed: false,
            });
        }

        // Rounds 3 and beyond: empty placeholders
        for (let r = 3; r <= rounds; r++) {
            const matchesInRound = size / Math.pow(2, r);
            for (let m = 0; m < matchesInRound; m++) {
                matches.push({
                    tournamentId,
                    round: r,
                    position: m,
                    stage: 'BRACKET',
                    team1Id: null,
                    team2Id: null,
                    isPlayed: false,
                });
            }
        }

        // Third place match
        if (rounds > 1) {
            matches.push({
                tournamentId,
                round: rounds,
                position: 1,
                stage: 'BRACKET',
                team1Id: null,
                team2Id: null,
                isPlayed: false,
            });
        }

        return matches;
    }

    /**
     * Generate round-robin matches for teams
     */
    private static generateTeamRoundRobin(tournamentId: string, teamIds: string[], hasReturnLeg: boolean = false): any[] {
        const matches: any[] = [];
        const n = teamIds.length;
        const isOdd = n % 2 !== 0;
        const teams = isOdd ? [...teamIds, null] : teamIds;
        const numTeams = teams.length;
        const numRounds = numTeams - 1;
        const half = numTeams / 2;

        const rotatingTeams = teams.slice(0, numTeams - 1);
        const lastTeam = teams[numTeams - 1];

        for (let round = 0; round < numRounds; round++) {
            // Pair with fixed team
            const t1 = rotatingTeams[0];
            const t2 = lastTeam;
            if (t1 && t2) {
                matches.push({
                    tournamentId,
                    team1Id: t1,
                    team2Id: t2,
                    round: round + 1,
                    position: round * half,
                    stage: 'LEAGUE',
                    isPlayed: false
                });

                if (hasReturnLeg) {
                    matches.push({
                        tournamentId,
                        team1Id: t2,
                        team2Id: t1,
                        round: round + 1,
                        position: 100000 + (round * half),
                        stage: 'LEAGUE',
                        isPlayed: false
                    });
                }
            }

            // Pair others
            for (let i = 1; i < half; i++) {
                const a = rotatingTeams[i];
                const b = rotatingTeams[rotatingTeams.length - i];
                if (a && b) {
                    matches.push({
                        tournamentId,
                        team1Id: a,
                        team2Id: b,
                        round: round + 1,
                        position: round * half + i,
                        stage: 'LEAGUE',
                        isPlayed: false
                    });

                    if (hasReturnLeg) {
                        matches.push({
                            tournamentId,
                            team1Id: b,
                            team2Id: a,
                            round: round + 1,
                            position: 100000 + (round * half) + i,
                            stage: 'LEAGUE',
                            isPlayed: false
                        });
                    }
                }
            }

            // Rotate
            const first = rotatingTeams.shift();
            if (first) rotatingTeams.push(first);
        }

        return matches;
    }

    /**
     * Generate group matches for teams
     */
    private static generateTeamGroupMatches(tournamentId: string, teamIds: string[], hasReturnLeg: boolean = false): any[] {
        const shuffled = [...teamIds];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const half = Math.floor(shuffled.length / 2);
        const group1 = shuffled.slice(0, half);
        const group2 = shuffled.slice(half);

        const matches: any[] = [];

        // Group 1 matches
        const g1Matches = this.generateTeamRoundRobin(tournamentId, group1, hasReturnLeg);
        g1Matches.forEach(m => {
            m.stage = 'GROUP_1';
            matches.push(m);
        });

        // Group 2 matches
        const g2Matches = this.generateTeamRoundRobin(tournamentId, group2, hasReturnLeg);
        g2Matches.forEach(m => {
            m.stage = 'GROUP_2';
            matches.push(m);
        });

        return matches;
    }
}
