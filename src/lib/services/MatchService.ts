
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

            // 1. Log Start/End/Score
            if (!wasPlayed) {
                await TickerService.createEvent(
                    match.tournamentId,
                    'MATCH_START',
                    `Anstoß: ${p1Name} vs ${p2Name}`,
                    matchId
                );
            }

            await TickerService.createEvent(
                match.tournamentId,
                'SCORE_UPDATE',
                `${p1Name} vs ${p2Name}: ${scoreString}`,
                matchId
            );

            // 2. Trigger AI Commentary (Async)
            const context = `Match: ${p1Name} vs ${p2Name}. Neuer Spielstand: ${scoreString}.`;
            TickerService.triggerCommentary(match.tournamentId, matchId, context);
        }

        if (match.stage === "GROUP" || match.stage === "GROUP_1" || match.stage === "GROUP_2") {
            await this.updateGroupStandings(match.tournamentId, match.player1Id!, match.player2Id!, score1, score2);
            await this.checkGroupStageCompletion(match.tournamentId);
        } else if (match.stage === "LEAGUE") {
            await this.updateGroupStandings(match.tournamentId, match.player1Id!, match.player2Id!, score1, score2);
            await this.checkLeagueCompletion(match.tournamentId);
        } else if (match.stage === "BRACKET" || match.stage === "KNOCKOUT") {
            await this.checkBracketProgression(match.tournamentId, match.round, match.position, winnerId);
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
                stage: { in: ["GROUP", "GROUP_1", "GROUP_2"] },
                isPlayed: false
            }
        });

        if (unplayed === 0) {
            // All group matches done! Generate Bracket.
            const { TournamentService } = await import("./TournamentService");
            await TournamentService.generateKnockoutFromGroups(tournamentId);
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


    private static async checkBracketProgression(tournamentId: string, currentRound: number, currentPosition: number, winnerId: string | null) {
        if (!winnerId) return;

        // 1. Check if this was the Final
        const totalMatchesInRound = await prisma.match.count({
            where: { tournamentId, round: currentRound, stage: "BRACKET" }
        });

        // Normally, the Final is Round X, Position 0, and it's the ONLY match in that round (unless 3rd place exists at Position 1)
        if (totalMatchesInRound === 1 || (totalMatchesInRound === 2 && currentPosition === 0)) {
            // Check if all matches in this round are played
            const unplayed = await prisma.match.count({
                where: { tournamentId, round: currentRound, stage: "BRACKET", isPlayed: false }
            });

            if (unplayed === 0) {
                await prisma.tournament.update({
                    where: { id: tournamentId },
                    data: { status: "COMPLETED" }
                });
            }
            return;
        }

        // 2. Advance winner to next round placeholder
        const nextRound = currentRound + 1;
        const nextPosition = Math.floor(currentPosition / 2);
        const isPlayer1 = currentPosition % 2 === 0;

        const nextMatch = await prisma.match.findFirst({
            where: {
                tournamentId,
                round: nextRound,
                position: nextPosition,
                stage: "BRACKET"
            }
        });

        if (nextMatch) {
            await prisma.match.update({
                where: { id: nextMatch.id },
                data: isPlayer1 ? { player1Id: winnerId } : { player2Id: winnerId }
            });

            // Handle BYE logic if the new opponent doesn't exist (should have been handled during generation but safety first)
            // Actually, in a pre-generated bracket, we just wait for the other side of the bracket.
        }

        // 3. Handle Loser for 3rd Place Match (Special Case)
        // If we are in the Semi-Finals (Round = FinalRound - 1)
        const finalRoundMatch = await prisma.match.findFirst({
            where: { tournamentId, stage: "BRACKET" },
            orderBy: { round: 'desc' }
        });

        if (finalRoundMatch && currentRound === finalRoundMatch.round - 1) {
            const thirdPlaceMatch = await prisma.match.findFirst({
                where: {
                    tournamentId,
                    round: finalRoundMatch.round,
                    position: 1,
                    stage: "BRACKET"
                }
            });

            if (thirdPlaceMatch) {
                const loserId = await prisma.match.findUnique({ where: { id: await prisma.match.findFirst({ where: { tournamentId, round: currentRound, position: currentPosition } }).then(m => m?.id || "") } }).then(m => m?.player1Id === winnerId ? m?.player2Id : m?.player1Id);
                // Note: Getting loser requires re-fetching or passing it. Let's keep it simple for now.
                // We'll re-fetch the match to find the loser.
                const matchObj = await prisma.match.findFirst({
                    where: { tournamentId, round: currentRound, position: currentPosition }
                });
                const actualLoserId = matchObj?.player1Id === winnerId ? matchObj?.player2Id : matchObj?.player1Id;

                if (actualLoserId) {
                    await prisma.match.update({
                        where: { id: thirdPlaceMatch.id },
                        data: isPlayer1 ? { player1Id: actualLoserId } : { player2Id: actualLoserId }
                    });
                }
            }
        }
    }
}
