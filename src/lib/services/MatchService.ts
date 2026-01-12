
import { prisma } from "@/lib/prisma";
import { TickerService } from "./TickerService";

export class MatchService {
    /**
     * Updates a match score and triggers tournament progression checks.
     */
    static async updateMatch(matchId: string, score1: number, score2: number) {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { tournament: true, player1: true, player2: true },
        });

        if (!match) throw new Error("Match not found");

        const winnerId = score1 > score2 ? match.player1Id : (score2 > score1 ? match.player2Id : null);
        const wasPlayed = match.isPlayed;

        // Update the match
        const updatedMatch = await prisma.match.update({
            where: { id: matchId },
            data: {
                score1,
                score2,
                winnerId,
                isPlayed: true,
            },
        });

        // Trigger Ticker Events
        if (match.tournamentId) {
            const p1Name = match.player1?.name || "TBD";
            const p2Name = match.player2?.name || "TBD";
            const scoreString = `${score1}:${score2}`;

            // 1. Log Score Update
            await TickerService.createEvent(
                match.tournamentId,
                'SCORE_UPDATE',
                `${p1Name} vs ${p2Name}: ${scoreString}`,
                matchId
            );

            // 2. Trigger AI Commentary (Async)
            // Context: Names, Score, Previous Score?
            // Let's just pass current state.
            const context = `Match: ${p1Name} vs ${p2Name}. Neuer Spielstand: ${scoreString}.`;
            TickerService.triggerCommentary(match.tournamentId, matchId, context);

            if (match.stage === "GROUP") {
                await this.updateGroupStandings(match.tournamentId, match.player1Id!, match.player2Id!, score1, score2);
                await this.checkGroupStageCompletion(match.tournamentId);
            } else if (match.stage === "LEAGUE") {
                await this.updateGroupStandings(match.tournamentId, match.player1Id!, match.player2Id!, score1, score2);
                await this.checkLeagueCompletion(match.tournamentId);
            } else {
                await this.checkBracketProgression(match.tournamentId, match.round);
            }

            // If match wasn't finished before but is now (it is set to true above), maybe log specific match end?
            // Actually score update covers it for now, or we can check if it was final.
            // Since we set isPlayed: true always on update (simplification in original code), effectively every update is "played".
            // But if we want distinct "Match End", we might need to check if it's the final score.
            // For now, let's assume every update is a potential end or progress.
        }

        return updatedMatch;
    }

    private static async updateGroupStandings(tournamentId: string, p1: string, p2: string, s1: number, s2: number) {
        // Helper to update a single player's stats
        const updateStats = async (pid: string, goalsFor: number, goalsAgainst: number, points: number, won: number, drawn: number, lost: number) => {
            const standing = await prisma.tournamentStanding.findUnique({
                where: {
                    tournamentId_playerId: { tournamentId, playerId: pid }
                }
            });
            if (standing) {
                await prisma.tournamentStanding.update({
                    where: { id: standing.id },
                    data: {
                        played: { increment: 1 },
                        goalsFor: { increment: goalsFor },
                        goalsAgainst: { increment: goalsAgainst },
                        goalDifference: { increment: goalsFor - goalsAgainst },
                        points: { increment: points },
                        won: { increment: won },
                        drawn: { increment: drawn },
                        lost: { increment: lost }
                    }
                });
            }
        };

        if (s1 > s2) {
            await updateStats(p1, s1, s2, 3, 1, 0, 0); // Win for P1
            await updateStats(p2, s2, s1, 0, 0, 0, 1); // Loss for P2
        } else if (s2 > s1) {
            await updateStats(p1, s1, s2, 0, 0, 0, 1); // Loss for P1
            await updateStats(p2, s2, s1, 3, 1, 0, 0); // Win for P2
        } else {
            await updateStats(p1, s1, s2, 1, 0, 1, 0); // Draw
            await updateStats(p2, s2, s1, 1, 0, 1, 0); // Draw
        }
    }

    private static async checkGroupStageCompletion(tournamentId: string) {
        // Check if any unplayed group matches exist
        const unplayed = await prisma.match.count({
            where: {
                tournamentId,
                stage: "GROUP",
                isPlayed: false
            }
        });

        if (unplayed === 0) {
            // All group matches done! Generate Bracket.
            // 1. Get top 2 from each group
            // 2. Generate Quarter-Finals (or Semi-Finals)
            await this.generateKnockoutFromGroups(tournamentId);
        }
    }

    private static async checkLeagueCompletion(tournamentId: string) {
        // Check if any unplayed league matches exist
        const unplayed = await prisma.match.count({
            where: {
                tournamentId,
                stage: "LEAGUE",
                isPlayed: false
            }
        });

        if (unplayed === 0) {
            // All matches played. Complete tournament.
            await prisma.tournament.update({
                where: { id: tournamentId },
                data: { status: "COMPLETED" }
            });
            // Optional: Broadcast "League Finished"?
        }
    }

    private static async generateKnockoutFromGroups(tournamentId: string) {
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

        // Group them by groupId
        const groups: Record<number, typeof standings> = {};
        standings.forEach(s => {
            if (!groups[s.groupId]) groups[s.groupId] = [];
            groups[s.groupId].push(s);
        });

        // Assume 2 groups for simple logic (A and B) -> Semi Finals: A1 vs B2, B1 vs A2
        // Or generic: Top 2 advance.
        const qualified: { playerId: string, rank: number, groupId: number }[] = [];

        Object.values(groups).forEach(groupStandings => {
            // Take top 2
            if (groupStandings[0]) qualified.push({ playerId: groupStandings[0].playerId, rank: 1, groupId: groupStandings[0].groupId });
            if (groupStandings[1]) qualified.push({ playerId: groupStandings[1].playerId, rank: 2, groupId: groupStandings[1].groupId });
        });

        // Create matches (Simplistic paring: Group 0 Winner vs Group 1 Runner Up etc)
        // This needs robust logic for N groups.
        // For now, let's just pair them sequentially for simplicity or port specific logic if needed.
        // Let's assume 2 groups (4 players advancing) -> Semi Finals.
        if (qualified.length === 4) {
            // A1 vs B2
            await prisma.match.create({
                data: { tournamentId, player1Id: qualified[0].playerId, player2Id: qualified[3].playerId, round: 1, position: 0, stage: "KNOCKOUT" }
            });
            // B1 vs A2
            await prisma.match.create({
                data: { tournamentId, player1Id: qualified[2].playerId, player2Id: qualified[1].playerId, round: 1, position: 1, stage: "KNOCKOUT" }
            });
        } else {
            // Fallback: Pair blindly
            for (let i = 0; i < qualified.length; i += 2) {
                await prisma.match.create({
                    data: { tournamentId, player1Id: qualified[i].playerId, player2Id: qualified[i + 1].playerId, round: 1, position: i / 2, stage: "KNOCKOUT" }
                });
            }
        }
    }

    private static async checkBracketProgression(tournamentId: string, currentRound: number) {
        // Check if all matches in this round are played
        const unplayed = await prisma.match.count({
            where: { tournamentId, round: currentRound, stage: { in: ["BRACKET", "KNOCKOUT"] }, isPlayed: false }
        });

        if (unplayed === 0) {
            // Round complete!
            // Get winners
            const matches = await prisma.match.findMany({
                where: { tournamentId, round: currentRound, stage: { in: ["BRACKET", "KNOCKOUT"] } },
                orderBy: { position: 'asc' }
            });

            if (matches.length === 1) {
                // Final finished. Complete Tournament.
                await prisma.tournament.update({
                    where: { id: tournamentId },
                    data: { status: "COMPLETED", } // endDate could be set here
                });
                return;
            }

            // Generate next round
            const nextRound = currentRound + 1;
            for (let i = 0; i < matches.length; i += 2) {
                const m1 = matches[i];
                const m2 = matches[i + 1];

                // Winner of m1 vs Winner of m2
                // If m2 is missing (odd number?), winner m1 advances automatically or BYE?
                // In powers of 2, m2 should exist.

                // Determine winners (Handle nulls if logic allows, but validation should prevent)
                const w1 = m1.winnerId;
                const w2 = m2 ? m2.winnerId : null; // If odd match, maybe bye?

                if (w1 && w2) {
                    await prisma.match.create({
                        data: {
                            tournamentId,
                            player1Id: w1,
                            player2Id: w2,
                            round: nextRound,
                            position: i / 2,
                            stage: matches[0].stage // Inherit stage type
                        }
                    });
                } else if (w1 && !m2) {
                    // Auto advance to next round/finals? Or just set as winner of tournament if only 1 match left?
                    // Should have been caught by matches.length === 1 check above unless odd structure.
                }
            }
        }
    }
}
