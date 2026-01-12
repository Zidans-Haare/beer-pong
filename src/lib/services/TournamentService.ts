import { prisma } from "@/lib/prisma";
import {
    generateSingleEliminationBracket,
    generateRoundRobinMatches,
    generateGroupStageMatches
} from "@/lib/brackets";

export class TournamentService {
    /**
     * Starts a tournament by setting status to ACTIVE and generating initial matches.
     */
    static async startTournament(tournamentId: string) {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                rsvps: {
                    where: { status: 'YES' },
                    include: { player: true }
                }
            },
        });

        if (!tournament) throw new Error("Tournament not found");

        const players = tournament.rsvps.map(p => ({ id: p.playerId }));
        const playerIds = tournament.rsvps.map(p => p.playerId);

        if (playerIds.length < 2) throw new Error("Mindestens 2 Teilnehmer (Dabei) erforderlich.");

        // Sync participants for consistency (optional but good for schema health)
        for (const pid of playerIds) {
            await prisma.tournamentParticipant.upsert({
                where: { tournamentId_playerId: { tournamentId, playerId: pid } },
                update: {},
                create: { tournamentId, playerId: pid }
            });
        }

        let matches: any[] = [];

        if (tournament.type === "SINGLE_ELIMINATION" || tournament.type === "ELIMINATION") {
            matches = generateSingleEliminationBracket(tournamentId, players);
        } else if (tournament.type === "GROUP_AND_KNOCKOUT" || tournament.type === "GROUPS") {
            // Groups require at least 4 players (2 per group minimum)
            if (playerIds.length < 4) {
                throw new Error("Gruppenphasen-Turniere benötigen mindestens 4 Teilnehmer. Verwende stattdessen 'Jeder gegen Jeden' oder 'K.O.-System'.");
            }

            matches = generateGroupStageMatches(tournamentId, playerIds, tournament.hasReturnLeg);

            // Create Standings for Groups
            const mid = Math.ceil(playerIds.length / 2);
            // Standings are created during match generation in older logic, but here we need them for stats
            // We'll follow the group split from generateGroupStageMatches (sequential for standings is fine as long as matches match)
            // Wait, brackets.ts shuffles internally. This is a bit tricky if we want to match standings.
            // Let's adjust brackets.ts or handle standings here.
            // Actually, TournamentService.generateGroupStage did its own shuffle.
            // To be safe, let's just create standings for all participants and assign them to the correct group based on the generated matches.
        } else if (tournament.type === "ROUND_ROBIN") {
            matches = generateRoundRobinMatches(tournamentId, playerIds, tournament.hasReturnLeg);

            // Create Standings for League
            for (const pid of playerIds) {
                await prisma.tournamentStanding.upsert({
                    where: { tournamentId_playerId: { tournamentId, playerId: pid } },
                    update: {},
                    create: { tournamentId, playerId: pid, groupId: 0 }
                });
            }
        }

        // Handle Standings for Groups (Special Case)
        if (tournament.type === "GROUPS" || tournament.type === "GROUP_AND_KNOCKOUT") {
            // Find which player is in which stage (GROUP_1 or GROUP_2) from the generated matches
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
            // Prisma createMany is faster
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
    }

    /**
     * Generates Knockout phase (Bracket) from Group standings.
     */
    static async generateKnockoutFromGroups(tournamentId: string) {
        // Fetch all standings
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
        Object.values(groups).forEach(groupStandings => {
            if (groupStandings[0]) qualified.push({ playerId: groupStandings[0].playerId, rank: 1, groupId: groupStandings[0].groupId });
            if (groupStandings[1]) qualified.push({ playerId: groupStandings[1].playerId, rank: 2, groupId: groupStandings[1].groupId });
        });

        // 1. Create the Semi-Finals matches
        if (qualified.length === 4) {
            await prisma.match.create({
                data: { tournamentId, player1Id: qualified[0].playerId, player2Id: qualified[3].playerId, round: 1, position: 0, stage: "BRACKET" }
            });
            await prisma.match.create({
                data: { tournamentId, player1Id: qualified[2].playerId, player2Id: qualified[1].playerId, round: 1, position: 1, stage: "BRACKET" }
            });

            // 2. Create the Final Placeholder (Round 2, Position 0)
            await prisma.match.create({
                data: { tournamentId, player1Id: null, player2Id: null, round: 2, position: 0, stage: "BRACKET" }
            });

            // 3. Create 3rd Place Placeholder (Round 2, Position 1)
            await prisma.match.create({
                data: { tournamentId, player1Id: null, player2Id: null, round: 2, position: 1, stage: "BRACKET" }
            });
        } else {
            // Fallback for different group counts
            for (let i = 0; i < qualified.length; i += 2) {
                if (qualified[i] && qualified[i + 1]) {
                    await prisma.match.create({
                        data: { tournamentId, player1Id: qualified[i].playerId, player2Id: qualified[i + 1].playerId, round: 1, position: i / 2, stage: "BRACKET" }
                    });
                }
            }
            const nextRoundMatches = Math.ceil(qualified.length / 4);
            for (let m = 0; m < nextRoundMatches; m++) {
                await prisma.match.create({
                    data: { tournamentId, player1Id: null, player2Id: null, round: 2, position: m, stage: "BRACKET" }
                });
            }
        }
    }
}
