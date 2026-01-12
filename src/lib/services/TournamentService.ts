
import { prisma } from "@/lib/prisma";

export class TournamentService {
    /**
     * Starts a tournament by setting status to ACTIVE and generating initial matches.
     */
    static async startTournament(tournamentId: string) {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { participants: { include: { player: true } } },
        });

        if (!tournament) throw new Error("Tournament not found");

        if (tournament.type === "SINGLE_ELIMINATION" || tournament.type === "ELIMINATION") {
            await this.generateSingleEliminationBracket(tournamentId, tournament.participants.map(p => p.playerId));
        } else if (tournament.type === "GROUP_AND_KNOCKOUT" || tournament.type === "GROUPS") {
            await this.generateGroupStage(tournamentId, tournament.participants.map(p => p.playerId), tournament.hasReturnLeg);
        } else if (tournament.type === "ROUND_ROBIN") {
            await this.generateRoundRobin(tournamentId, tournament.participants.map(p => p.playerId), tournament.hasReturnLeg);
        }

        // Update status
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: "ACTIVE" },
        });
    }

    /**
     * Generates a Single Elimination Bracket.
     * Simple implementation: Shuffles players and pairs them up.
     * Does NOT currently handle BYEs (requires power of 2 players for perfect bracket).
     */
    private static async generateSingleEliminationBracket(tournamentId: string, playerIds: string[]) {
        const shuffled = [...playerIds].sort(() => 0.5 - Math.random());
        const matches = [];

        // For now, assuming even number or handling odd by ignoring last? 
        // Ideally should check power of 2, but for "Beer Pong" we often just play.
        // Let's pair them up.

        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                matches.push({
                    tournamentId,
                    player1Id: shuffled[i],
                    player2Id: shuffled[i + 1],
                    round: 1,
                    position: i / 2,
                    stage: "BRACKET",
                    isPlayed: false
                });
            } else {
                // Odd player out - in a real bracket they'd get a bye.
                // For now, let's just leave them unmatched or handle as bye later.
                // We'll ignore for this simple fix, or maybe create a match with no opponent?
                // Creating a match with null player2 implies a bye often.
                matches.push({
                    tournamentId,
                    player1Id: shuffled[i],
                    player2Id: undefined, // Bye
                    round: 1,
                    position: i / 2,
                    stage: "BRACKET",
                    isPlayed: true, // Auto-win
                    winnerId: shuffled[i],
                    score1: 0,
                    score2: 0
                });
            }
        }

        await prisma.match.createMany({ data: matches });
    }

    /**
     * Generates a Round Robin (League) schedule.
     */
    private static async generateRoundRobin(tournamentId: string, playerIds: string[], hasReturnLeg: boolean) {
        // 1. Create Standings
        for (const pid of playerIds) {
            await prisma.tournamentStanding.create({
                data: {
                    tournamentId,
                    playerId: pid,
                    groupId: 0, // Single group for League
                }
            });
        }

        // 2. Generate Matches
        const matches = [];
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                // First Leg
                matches.push({
                    tournamentId,
                    player1Id: playerIds[i],
                    player2Id: playerIds[j],
                    stage: "LEAGUE", // Use LEAGUE to distinguish from Group Phase
                    round: 1,
                    position: 0,
                    isPlayed: false
                });

                // Return Leg
                if (hasReturnLeg) {
                    matches.push({
                        tournamentId,
                        player1Id: playerIds[j], // Swap home/away
                        player2Id: playerIds[i],
                        stage: "LEAGUE",
                        round: 2, // Distinction for sorting
                        position: 0,
                        isPlayed: false
                    });
                }
            }
        }

        await prisma.match.createMany({ data: matches });
    }

    private static async generateGroupStage(tournamentId: string, playerIds: string[], hasReturnLeg: boolean) {
        // Logic for groups
        // 1. Determine number of groups (e.g. 4 players per group)
        const groupSize = 4;
        const numGroups = Math.ceil(playerIds.length / groupSize);

        const shuffled = [...playerIds].sort(() => 0.5 - Math.random());

        const groups: string[][] = Array.from({ length: numGroups }, () => []);

        shuffled.forEach((pid, index) => {
            groups[index % numGroups].push(pid);
        });

        // 2. Create TournamentStanding entries
        for (let i = 0; i < numGroups; i++) {
            const groupPlayers = groups[i];
            for (const pid of groupPlayers) {
                await prisma.tournamentStanding.create({
                    data: {
                        tournamentId,
                        playerId: pid,
                        groupId: i,
                    }
                });
            }

            // 3. Create Round Robin matches for this group
            for (let a = 0; a < groupPlayers.length; a++) {
                for (let b = a + 1; b < groupPlayers.length; b++) {
                    // Leg 1
                    await prisma.match.create({
                        data: {
                            tournamentId,
                            player1Id: groupPlayers[a],
                            player2Id: groupPlayers[b],
                            stage: "GROUP",
                            round: 1,
                            position: 0,
                            isPlayed: false
                        }
                    });

                    // Leg 2
                    if (hasReturnLeg) {
                        await prisma.match.create({
                            data: {
                                tournamentId,
                                player1Id: groupPlayers[b],
                                player2Id: groupPlayers[a],
                                stage: "GROUP",
                                round: 2,
                                position: 0,
                                isPlayed: false
                            }
                        });
                    }
                }
            }
        }
    }
}
