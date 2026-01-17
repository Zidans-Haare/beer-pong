
import { prisma } from "@/lib/prisma";
import { TickerService } from "./TickerService";
import { recordMatchDuration, markMatchStarted } from "@/lib/duration";
import { sendPushToUser } from "@/lib/push";

export class MatchService {
    /**
     * Notifies both players that their match is ready to play.
     */
    private static async notifyMatchReady(matchId: string, tournamentId: string) {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                player1: true,
                player2: true,
                team1: { include: { player1: true, player2: true } },
                team2: { include: { player1: true, player2: true } },
                tournament: true,
            },
        });

        if (!match || !match.tournament) return;

        const tournamentLink = `/tournament/${tournamentId}`;
        const isTeamMatch = !!match.team1Id && !!match.team2Id;

        if (isTeamMatch) {
            // Team match - notify all team members
            const { getTeamDisplayName } = await import("@/lib/teams");
            const team1Name = match.team1 ? getTeamDisplayName(match.team1) : "Team 1";
            const team2Name = match.team2 ? getTeamDisplayName(match.team2) : "Team 2";

            // Notify Team 1 members
            if (match.team1) {
                const team1Players = [match.team1.player1Id, match.team1.player2Id].filter(Boolean);
                for (const playerId of team1Players) {
                    if (playerId) {
                        const player = await prisma.player.findUnique({ where: { id: playerId } });
                        if (player?.userId) {
                            await sendPushToUser(
                                player.userId,
                                "Du bist dran!",
                                `Euer Match gegen ${team2Name} kann jetzt gespielt werden.`,
                                tournamentLink
                            );
                        }
                    }
                }
            }

            // Notify Team 2 members
            if (match.team2) {
                const team2Players = [match.team2.player1Id, match.team2.player2Id].filter(Boolean);
                for (const playerId of team2Players) {
                    if (playerId) {
                        const player = await prisma.player.findUnique({ where: { id: playerId } });
                        if (player?.userId) {
                            await sendPushToUser(
                                player.userId,
                                "Du bist dran!",
                                `Euer Match gegen ${team1Name} kann jetzt gespielt werden.`,
                                tournamentLink
                            );
                        }
                    }
                }
            }
        } else {
            // Player match - notify both players
            const player1Name = match.player1?.name || "Gegner";
            const player2Name = match.player2?.name || "Gegner";

            if (match.player1?.userId) {
                await sendPushToUser(
                    match.player1.userId,
                    "Du bist dran!",
                    `Dein Match gegen ${player2Name} kann jetzt gespielt werden.`,
                    tournamentLink
                );
            }

            if (match.player2?.userId) {
                await sendPushToUser(
                    match.player2.userId,
                    "Du bist dran!",
                    `Dein Match gegen ${player1Name} kann jetzt gespielt werden.`,
                    tournamentLink
                );
            }
        }
    }

    /**
     * Advances a winner to the next round without updating the current match.
     * Used for Bye-matches that are already marked as played.
     */
    static async advanceWinner(tournamentId: string, currentRound: number, currentPosition: number, winnerId: string) {
        const nextRound = currentRound + 1;
        const nextPosition = Math.floor(currentPosition / 2);
        const isPlayer1InNext = currentPosition % 2 === 0;

        const nextMatch = await prisma.match.findFirst({
            where: { tournamentId, round: nextRound, position: nextPosition, stage: "BRACKET" }
        });

        if (nextMatch) {
            const updateData = isPlayer1InNext ? { player1Id: winnerId } : { player2Id: winnerId };
            await prisma.match.update({ where: { id: nextMatch.id }, data: updateData });
        }
    }

    /**
     * Updates a match score and triggers tournament progression checks.
     */
    static async updateMatch(matchId: string, score1: number, score2: number) {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { tournament: true, player1: true, player2: true, team1: true, team2: true },
        });

        if (!match) throw new Error("Match not found");

        const isTeamMatch = !!match.team1Id && !!match.team2Id;
        const wasPlayed = match.isPlayed;

        // Determine winner (team or player based on match type)
        let updateData: any = {
            score1,
            score2,
            isPlayed: true,
        };

        if (isTeamMatch) {
            updateData.winnerTeamId = score1 > score2 ? match.team1Id : (score2 > score1 ? match.team2Id : null);
        } else {
            updateData.winnerId = score1 > score2 ? match.player1Id : (score2 > score1 ? match.player2Id : null);
        }

        // Update the match
        const updatedMatch = await prisma.match.update({
            where: { id: matchId },
            data: updateData,
        });

        // Record match duration for statistics
        const winner = isTeamMatch ? updateData.winnerTeamId : updateData.winnerId;
        if (!wasPlayed && winner) {
            await recordMatchDuration(matchId, match.startedAt || undefined);
        }

        // Trigger Ticker Events
        if (match.tournamentId) {
            let name1: string, name2: string;
            if (isTeamMatch) {
                const { getTeamDisplayName } = await import('@/lib/teams');
                name1 = match.team1 ? getTeamDisplayName(match.team1) : "TBD";
                name2 = match.team2 ? getTeamDisplayName(match.team2) : "TBD";
            } else {
                name1 = match.player1?.name || "TBD";
                name2 = match.player2?.name || "TBD";
            }
            const scoreString = `${score1}:${score2}`;

            // Log Score Update (no more "Anstoß" - it was redundant)
            await TickerService.createEvent(
                match.tournamentId,
                'SCORE_UPDATE',
                `${name1} vs ${name2}: ${scoreString}`,
                matchId
            );

            // 2. Trigger AI Commentary (Async)
            const context = `Match: ${name1} vs ${name2}. Neuer Spielstand: ${scoreString}.`;
            TickerService.triggerCommentary(match.tournamentId, matchId, context);
        }

        // Skip group standings for team matches (would need team standings table)
        if (!isTeamMatch) {
            if (match.stage === "GROUP" || match.stage === "GROUP_1" || match.stage === "GROUP_2") {
                await this.updateGroupStandings(match.tournamentId, match.player1Id!, match.player2Id!, score1, score2);
                await this.checkGroupStageCompletion(match.tournamentId);
            } else if (match.stage === "LEAGUE") {
                await this.updateGroupStandings(match.tournamentId, match.player1Id!, match.player2Id!, score1, score2);
                await this.checkLeagueCompletion(match.tournamentId);
            }
        }

        if (match.stage === "BRACKET" || match.stage === "KNOCKOUT") {
            // For team matches, we need to handle progression differently (using team IDs)
            if (isTeamMatch) {
                await this.checkBracketProgressionTeam(match.tournamentId, match.round, match.position, updateData.winnerTeamId, match.id);
            } else {
                await this.checkBracketProgression(match.tournamentId, match.round, match.position, updateData.winnerId, match.id);
            }
        }

        return updatedMatch;
    }

    /**
     * Starts a match manually (Anstoß).
     * Triggers Ticker Notification and sets startedAt timestamp.
     */
    static async startMatch(matchId: string) {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { tournament: true, player1: true, player2: true, team1: true, team2: true },
        });

        if (!match) throw new Error("Match not found");
        if (match.startedAt) return; // Already started

        // 1. Mark as started in DB
        await markMatchStarted(matchId);

        // 2. Ticker Notification (Anstoß)
        if (match.tournamentId) {
            const isTeamMatch = !!match.team1Id && !!match.team2Id;
            let name1: string, name2: string;

            if (isTeamMatch) {
                const { getTeamDisplayName } = await import('@/lib/teams');
                name1 = match.team1 ? getTeamDisplayName(match.team1) : "Team 1";
                name2 = match.team2 ? getTeamDisplayName(match.team2) : "Team 2";
            } else {
                name1 = match.player1?.name || "Spieler 1";
                name2 = match.player2?.name || "Spieler 2";
            }

            await TickerService.createEvent(
                match.tournamentId,
                'MATCH_START',
                `Anstoß: ${name1} vs ${name2}!`,
                matchId
            );
        }
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
            // All group matches done!
            // NOTE: Playoffs are NOT generated automatically.
            // The tournament host must manually start the playoffs via the button.
            // This gives the host control over when to transition to knockout phase.
            console.log(`[GroupStage] All group matches completed for tournament ${tournamentId}. Ready for playoffs.`);
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


    private static async checkBracketProgression(
        tournamentId: string,
        currentRound: number,
        currentPosition: number,
        winnerId: string | null,
        matchId: string
    ) {
        if (!winnerId) return;

        console.log(`[Progression] Checking Match ${matchId} (R:${currentRound}, P:${currentPosition}, Winner:${winnerId})`);

        // 1. Check if this logic applies (Are we in a penultimate round?)
        const maxRoundMatch = await prisma.match.findFirst({
            where: { tournamentId, stage: "BRACKET" },
            orderBy: { round: 'desc' }
        });
        const maxRound = maxRoundMatch?.round || 0;

        // If current round is the max round, check completion
        if (currentRound >= maxRound) {
            const unplayed = await prisma.match.count({
                where: { tournamentId, round: currentRound, stage: "BRACKET", isPlayed: false }
            });
            if (unplayed === 0) {
                console.log("[Progression] Tournament Completed!");
                await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "COMPLETED" } });
            }
            return;
        }

        // 2. Logic for Advancement
        const nextRound = currentRound + 1;
        const nextPosition = Math.floor(currentPosition / 2);
        const isPlayer1InNext = currentPosition % 2 === 0;

        // A) Advance Winner -> Next Round Match (Final or otherwise)
        const nextMatch = await prisma.match.findFirst({
            where: { tournamentId, round: nextRound, position: nextPosition, stage: "BRACKET" }
        });

        if (nextMatch) {
            const updateData = isPlayer1InNext ? { player1Id: winnerId } : { player2Id: winnerId };
            console.log(`[Progression] Winner -> Match ${nextMatch.id} (Slot ${isPlayer1InNext ? 'P1' : 'P2'})`);
            const updated = await prisma.match.update({
                where: { id: nextMatch.id },
                data: updateData,
                select: { player1Id: true, player2Id: true }
            });

            // Mark match as started if both players are now set
            if (updated.player1Id && updated.player2Id) {
                await markMatchStarted(nextMatch.id);
                // Notify players that their match is ready
                this.notifyMatchReady(nextMatch.id, tournamentId);
            }
        }

        // B) Advance Loser -> 3rd Place Match (If applicable)
        // Only if (CurrentRound == MaxRound - 1) AND 3rd Place match exists.
        if (currentRound === maxRound - 1) {
            const thirdPlaceMatch = await prisma.match.findFirst({
                where: { tournamentId, round: nextRound, position: 1, stage: "BRACKET" }
            });

            if (thirdPlaceMatch && thirdPlaceMatch.id !== nextMatch?.id) {
                // Determine Loser
                const completedMatch = await prisma.match.findUnique({ where: { id: matchId } });
                const loserId = completedMatch?.player1Id === winnerId ? completedMatch?.player2Id : completedMatch?.player1Id;

                if (loserId) {
                    const updateData = isPlayer1InNext ? { player1Id: loserId } : { player2Id: loserId };
                    console.log(`[Progression] Loser -> 3rd Place Match ${thirdPlaceMatch.id} (Slot ${isPlayer1InNext ? 'P1' : 'P2'})`);
                    const updated3rd = await prisma.match.update({
                        where: { id: thirdPlaceMatch.id },
                        data: updateData,
                        select: { player1Id: true, player2Id: true }
                    });

                    // Mark 3rd place match as started if both players are now set
                    if (updated3rd.player1Id && updated3rd.player2Id) {
                        await markMatchStarted(thirdPlaceMatch.id);
                        // Notify players that their match is ready
                        this.notifyMatchReady(thirdPlaceMatch.id, tournamentId);
                    }
                }
            }
        }
    }

    /**
     * Check bracket progression for team matches (using team IDs)
     */
    private static async checkBracketProgressionTeam(
        tournamentId: string,
        currentRound: number,
        currentPosition: number,
        winnerTeamId: string | null,
        matchId: string
    ) {
        if (!winnerTeamId) return;

        console.log(`[Progression] Checking Team Match ${matchId} (R:${currentRound}, P:${currentPosition}, WinnerTeam:${winnerTeamId})`);

        const maxRoundMatch = await prisma.match.findFirst({
            where: { tournamentId, stage: "BRACKET" },
            orderBy: { round: 'desc' }
        });
        const maxRound = maxRoundMatch?.round || 0;

        if (currentRound >= maxRound) {
            const unplayed = await prisma.match.count({
                where: { tournamentId, round: currentRound, stage: "BRACKET", isPlayed: false }
            });
            if (unplayed === 0) {
                console.log("[Progression] Tournament Completed!");
                await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "COMPLETED" } });
            }
            return;
        }

        const nextRound = currentRound + 1;
        const nextPosition = Math.floor(currentPosition / 2);
        const isTeam1InNext = currentPosition % 2 === 0;

        const nextMatch = await prisma.match.findFirst({
            where: { tournamentId, round: nextRound, position: nextPosition, stage: "BRACKET" }
        });

        if (nextMatch) {
            const updateData = isTeam1InNext ? { team1Id: winnerTeamId } : { team2Id: winnerTeamId };
            console.log(`[Progression] Winner Team -> Match ${nextMatch.id} (Slot ${isTeam1InNext ? 'T1' : 'T2'})`);
            const updated = await prisma.match.update({
                where: { id: nextMatch.id },
                data: updateData,
                select: { team1Id: true, team2Id: true }
            });

            if (updated.team1Id && updated.team2Id) {
                await markMatchStarted(nextMatch.id);
                // Notify team players that their match is ready
                this.notifyMatchReady(nextMatch.id, tournamentId);
            }
        }

        // 3rd Place Match for teams
        if (currentRound === maxRound - 1) {
            const thirdPlaceMatch = await prisma.match.findFirst({
                where: { tournamentId, round: nextRound, position: 1, stage: "BRACKET" }
            });

            if (thirdPlaceMatch && thirdPlaceMatch.id !== nextMatch?.id) {
                const completedMatch = await prisma.match.findUnique({ where: { id: matchId } });
                const loserTeamId = completedMatch?.team1Id === winnerTeamId ? completedMatch?.team2Id : completedMatch?.team1Id;

                if (loserTeamId) {
                    const updateData = isTeam1InNext ? { team1Id: loserTeamId } : { team2Id: loserTeamId };
                    console.log(`[Progression] Loser Team -> 3rd Place Match ${thirdPlaceMatch.id}`);
                    const updated3rd = await prisma.match.update({
                        where: { id: thirdPlaceMatch.id },
                        data: updateData,
                        select: { team1Id: true, team2Id: true }
                    });

                    if (updated3rd.team1Id && updated3rd.team2Id) {
                        await markMatchStarted(thirdPlaceMatch.id);
                        // Notify team players that their match is ready
                        this.notifyMatchReady(thirdPlaceMatch.id, tournamentId);
                    }
                }
            }
        }
    }
}
