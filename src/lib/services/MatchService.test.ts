import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Mock prisma before importing the service
vi.mock('@/lib/prisma', () => ({
    prisma: {
        match: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            count: vi.fn(),
        },
        tournament: {
            update: vi.fn(),
        },
        tournamentStanding: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

// Mock other dependencies
vi.mock('./TickerService', () => ({
    TickerService: {
        createEvent: vi.fn(),
        triggerCommentary: vi.fn(),
    },
}));

vi.mock('@/lib/duration', () => ({
    recordMatchDuration: vi.fn(),
    markMatchStarted: vi.fn(),
}));

vi.mock('@/lib/teams', () => ({
    getTeamDisplayName: vi.fn((team) => team?.name || 'Team'),
}));

import { MatchService } from './MatchService';
import { prisma } from '@/lib/prisma';

// Type the mocks
const mockPrisma = prisma as unknown as {
    match: {
        findUnique: Mock;
        findFirst: Mock;
        findMany: Mock;
        update: Mock;
        count: Mock;
    };
    tournament: {
        update: Mock;
    };
    tournamentStanding: {
        findUnique: Mock;
        update: Mock;
    };
};

describe('MatchService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('advanceWinner', () => {
        it('should advance winner to player1 slot when position is even', async () => {
            const nextMatch = { id: 'next-match-id' };
            mockPrisma.match.findFirst.mockResolvedValue(nextMatch);
            mockPrisma.match.update.mockResolvedValue({});

            await MatchService.advanceWinner('tournament-1', 1, 0, 'winner-id');

            expect(mockPrisma.match.findFirst).toHaveBeenCalledWith({
                where: {
                    tournamentId: 'tournament-1',
                    round: 2,
                    position: 0,
                    stage: 'BRACKET',
                },
            });

            expect(mockPrisma.match.update).toHaveBeenCalledWith({
                where: { id: 'next-match-id' },
                data: { player1Id: 'winner-id' },
            });
        });

        it('should advance winner to player2 slot when position is odd', async () => {
            const nextMatch = { id: 'next-match-id' };
            mockPrisma.match.findFirst.mockResolvedValue(nextMatch);
            mockPrisma.match.update.mockResolvedValue({});

            await MatchService.advanceWinner('tournament-1', 1, 1, 'winner-id');

            expect(mockPrisma.match.findFirst).toHaveBeenCalledWith({
                where: {
                    tournamentId: 'tournament-1',
                    round: 2,
                    position: 0, // floor(1/2) = 0
                    stage: 'BRACKET',
                },
            });

            expect(mockPrisma.match.update).toHaveBeenCalledWith({
                where: { id: 'next-match-id' },
                data: { player2Id: 'winner-id' },
            });
        });

        it('should calculate correct next position for higher positions', async () => {
            const nextMatch = { id: 'next-match-id' };
            mockPrisma.match.findFirst.mockResolvedValue(nextMatch);
            mockPrisma.match.update.mockResolvedValue({});

            // Position 2 -> next position 1, player1 slot
            await MatchService.advanceWinner('tournament-1', 1, 2, 'winner-id');

            expect(mockPrisma.match.findFirst).toHaveBeenCalledWith({
                where: {
                    tournamentId: 'tournament-1',
                    round: 2,
                    position: 1, // floor(2/2) = 1
                    stage: 'BRACKET',
                },
            });

            expect(mockPrisma.match.update).toHaveBeenCalledWith({
                where: { id: 'next-match-id' },
                data: { player1Id: 'winner-id' }, // 2 % 2 === 0
            });
        });

        it('should not update if no next match found', async () => {
            mockPrisma.match.findFirst.mockResolvedValue(null);

            await MatchService.advanceWinner('tournament-1', 1, 0, 'winner-id');

            expect(mockPrisma.match.update).not.toHaveBeenCalled();
        });
    });

    describe('updateMatch', () => {
        const baseMockMatch = {
            id: 'match-1',
            tournamentId: 'tournament-1',
            player1Id: 'player-1',
            player2Id: 'player-2',
            team1Id: null,
            team2Id: null,
            round: 1,
            position: 0,
            stage: 'BRACKET',
            isPlayed: false,
            startedAt: new Date(),
            tournament: { id: 'tournament-1' },
            player1: { id: 'player-1', name: 'Player 1' },
            player2: { id: 'player-2', name: 'Player 2' },
            team1: null,
            team2: null,
        };

        it('should throw error if match not found', async () => {
            mockPrisma.match.findUnique.mockResolvedValue(null);

            await expect(MatchService.updateMatch('invalid-id', 10, 5))
                .rejects.toThrow('Match not found');
        });

        it('should set correct winner when player1 wins', async () => {
            mockPrisma.match.findUnique.mockResolvedValue(baseMockMatch);
            mockPrisma.match.update.mockResolvedValue({ ...baseMockMatch, isPlayed: true });
            mockPrisma.match.findFirst.mockResolvedValue({ round: 2 }); // maxRound
            mockPrisma.match.count.mockResolvedValue(0);

            await MatchService.updateMatch('match-1', 10, 5);

            expect(mockPrisma.match.update).toHaveBeenCalledWith({
                where: { id: 'match-1' },
                data: expect.objectContaining({
                    score1: 10,
                    score2: 5,
                    isPlayed: true,
                    winnerId: 'player-1',
                }),
            });
        });

        it('should set correct winner when player2 wins', async () => {
            mockPrisma.match.findUnique.mockResolvedValue(baseMockMatch);
            mockPrisma.match.update.mockResolvedValue({ ...baseMockMatch, isPlayed: true });
            mockPrisma.match.findFirst.mockResolvedValue({ round: 2 });
            mockPrisma.match.count.mockResolvedValue(0);

            await MatchService.updateMatch('match-1', 5, 10);

            expect(mockPrisma.match.update).toHaveBeenCalledWith({
                where: { id: 'match-1' },
                data: expect.objectContaining({
                    score1: 5,
                    score2: 10,
                    isPlayed: true,
                    winnerId: 'player-2',
                }),
            });
        });

        it('should set winnerId to null on draw', async () => {
            mockPrisma.match.findUnique.mockResolvedValue(baseMockMatch);
            mockPrisma.match.update.mockResolvedValue({ ...baseMockMatch, isPlayed: true });
            mockPrisma.match.findFirst.mockResolvedValue({ round: 2 });
            mockPrisma.match.count.mockResolvedValue(0);

            await MatchService.updateMatch('match-1', 5, 5);

            expect(mockPrisma.match.update).toHaveBeenCalledWith({
                where: { id: 'match-1' },
                data: expect.objectContaining({
                    score1: 5,
                    score2: 5,
                    isPlayed: true,
                    winnerId: null,
                }),
            });
        });

        it('should handle team matches correctly', async () => {
            const teamMatch = {
                ...baseMockMatch,
                player1Id: null,
                player2Id: null,
                team1Id: 'team-1',
                team2Id: 'team-2',
                team1: { id: 'team-1', name: 'Team 1' },
                team2: { id: 'team-2', name: 'Team 2' },
            };

            mockPrisma.match.findUnique.mockResolvedValue(teamMatch);
            mockPrisma.match.update.mockResolvedValue({ ...teamMatch, isPlayed: true });
            mockPrisma.match.findFirst.mockResolvedValue({ round: 2 });
            mockPrisma.match.count.mockResolvedValue(0);

            await MatchService.updateMatch('match-1', 10, 5);

            expect(mockPrisma.match.update).toHaveBeenCalledWith({
                where: { id: 'match-1' },
                data: expect.objectContaining({
                    score1: 10,
                    score2: 5,
                    isPlayed: true,
                    winnerTeamId: 'team-1',
                }),
            });
        });
    });

    describe('Bracket Progression Logic', () => {
        it('should complete tournament when final round is finished', async () => {
            const finalMatch = {
                id: 'final-match',
                tournamentId: 'tournament-1',
                player1Id: 'player-1',
                player2Id: 'player-2',
                team1Id: null,
                team2Id: null,
                round: 3, // Final round
                position: 0,
                stage: 'BRACKET',
                isPlayed: false,
                startedAt: new Date(),
                tournament: { id: 'tournament-1' },
                player1: { name: 'P1' },
                player2: { name: 'P2' },
                team1: null,
                team2: null,
            };

            mockPrisma.match.findUnique.mockResolvedValue(finalMatch);
            mockPrisma.match.update.mockResolvedValue({ ...finalMatch, isPlayed: true });
            // Max round is 3
            mockPrisma.match.findFirst.mockResolvedValue({ round: 3 });
            // No unplayed matches in final round
            mockPrisma.match.count.mockResolvedValue(0);
            mockPrisma.tournament.update.mockResolvedValue({});

            await MatchService.updateMatch('final-match', 10, 5);

            // Should mark tournament as completed
            expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
                where: { id: 'tournament-1' },
                data: { status: 'COMPLETED' },
            });
        });
    });

    describe('Group Standings Updates', () => {
        it('should update standings for league match', async () => {
            const leagueMatch = {
                id: 'league-match',
                tournamentId: 'tournament-1',
                player1Id: 'player-1',
                player2Id: 'player-2',
                team1Id: null,
                team2Id: null,
                round: 1,
                position: 0,
                stage: 'LEAGUE',
                isPlayed: false,
                startedAt: new Date(),
                tournament: { id: 'tournament-1' },
                player1: { name: 'P1' },
                player2: { name: 'P2' },
                team1: null,
                team2: null,
            };

            const standing1 = { id: 'standing-1', playerId: 'player-1' };
            const standing2 = { id: 'standing-2', playerId: 'player-2' };

            mockPrisma.match.findUnique.mockResolvedValue(leagueMatch);
            mockPrisma.match.update.mockResolvedValue({ ...leagueMatch, isPlayed: true });
            mockPrisma.tournamentStanding.findUnique
                .mockResolvedValueOnce(standing1)
                .mockResolvedValueOnce(standing2);
            mockPrisma.tournamentStanding.update.mockResolvedValue({});
            // Unplayed league matches > 0
            mockPrisma.match.count.mockResolvedValue(5);

            await MatchService.updateMatch('league-match', 10, 5);

            // Winner (player-1) should get 3 points
            expect(mockPrisma.tournamentStanding.update).toHaveBeenCalledWith({
                where: { id: 'standing-1' },
                data: expect.objectContaining({
                    played: { increment: 1 },
                    goalsFor: { increment: 10 },
                    goalsAgainst: { increment: 5 },
                    points: { increment: 3 },
                    won: { increment: 1 },
                    drawn: { increment: 0 },
                    lost: { increment: 0 },
                }),
            });

            // Loser (player-2) should get 0 points
            expect(mockPrisma.tournamentStanding.update).toHaveBeenCalledWith({
                where: { id: 'standing-2' },
                data: expect.objectContaining({
                    played: { increment: 1 },
                    goalsFor: { increment: 5 },
                    goalsAgainst: { increment: 10 },
                    points: { increment: 0 },
                    won: { increment: 0 },
                    drawn: { increment: 0 },
                    lost: { increment: 1 },
                }),
            });
        });

        it('should update standings for draw with 1 point each', async () => {
            const leagueMatch = {
                id: 'league-match',
                tournamentId: 'tournament-1',
                player1Id: 'player-1',
                player2Id: 'player-2',
                team1Id: null,
                team2Id: null,
                round: 1,
                position: 0,
                stage: 'LEAGUE',
                isPlayed: false,
                startedAt: new Date(),
                tournament: { id: 'tournament-1' },
                player1: { name: 'P1' },
                player2: { name: 'P2' },
                team1: null,
                team2: null,
            };

            const standing1 = { id: 'standing-1', playerId: 'player-1' };
            const standing2 = { id: 'standing-2', playerId: 'player-2' };

            mockPrisma.match.findUnique.mockResolvedValue(leagueMatch);
            mockPrisma.match.update.mockResolvedValue({ ...leagueMatch, isPlayed: true });
            mockPrisma.tournamentStanding.findUnique
                .mockResolvedValueOnce(standing1)
                .mockResolvedValueOnce(standing2);
            mockPrisma.tournamentStanding.update.mockResolvedValue({});
            mockPrisma.match.count.mockResolvedValue(5);

            await MatchService.updateMatch('league-match', 7, 7);

            // Both should get 1 point for draw
            expect(mockPrisma.tournamentStanding.update).toHaveBeenCalledWith({
                where: { id: 'standing-1' },
                data: expect.objectContaining({
                    points: { increment: 1 },
                    drawn: { increment: 1 },
                }),
            });

            expect(mockPrisma.tournamentStanding.update).toHaveBeenCalledWith({
                where: { id: 'standing-2' },
                data: expect.objectContaining({
                    points: { increment: 1 },
                    drawn: { increment: 1 },
                }),
            });
        });

        it('should complete league when all matches are played', async () => {
            const leagueMatch = {
                id: 'league-match',
                tournamentId: 'tournament-1',
                player1Id: 'player-1',
                player2Id: 'player-2',
                team1Id: null,
                team2Id: null,
                round: 1,
                position: 0,
                stage: 'LEAGUE',
                isPlayed: false,
                startedAt: new Date(),
                tournament: { id: 'tournament-1' },
                player1: { name: 'P1' },
                player2: { name: 'P2' },
                team1: null,
                team2: null,
            };

            mockPrisma.match.findUnique.mockResolvedValue(leagueMatch);
            mockPrisma.match.update.mockResolvedValue({ ...leagueMatch, isPlayed: true });
            mockPrisma.tournamentStanding.findUnique.mockResolvedValue({ id: 'standing' });
            mockPrisma.tournamentStanding.update.mockResolvedValue({});
            // No unplayed league matches
            mockPrisma.match.count.mockResolvedValue(0);
            mockPrisma.tournament.update.mockResolvedValue({});

            await MatchService.updateMatch('league-match', 10, 5);

            // Should complete tournament
            expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
                where: { id: 'tournament-1' },
                data: { status: 'COMPLETED' },
            });
        });
    });

    describe('Position Calculation Tests', () => {
        const testCases = [
            { position: 0, expectedNext: 0, expectedSlot: 'player1Id' },
            { position: 1, expectedNext: 0, expectedSlot: 'player2Id' },
            { position: 2, expectedNext: 1, expectedSlot: 'player1Id' },
            { position: 3, expectedNext: 1, expectedSlot: 'player2Id' },
            { position: 4, expectedNext: 2, expectedSlot: 'player1Id' },
            { position: 5, expectedNext: 2, expectedSlot: 'player2Id' },
            { position: 6, expectedNext: 3, expectedSlot: 'player1Id' },
            { position: 7, expectedNext: 3, expectedSlot: 'player2Id' },
        ];

        testCases.forEach(({ position, expectedNext, expectedSlot }) => {
            it(`position ${position} → next position ${expectedNext}, slot ${expectedSlot}`, async () => {
                const nextMatch = { id: 'next-match' };
                mockPrisma.match.findFirst.mockResolvedValue(nextMatch);
                mockPrisma.match.update.mockResolvedValue({});

                await MatchService.advanceWinner('tournament-1', 1, position, 'winner-id');

                expect(mockPrisma.match.findFirst).toHaveBeenCalledWith({
                    where: expect.objectContaining({
                        position: expectedNext,
                    }),
                });

                expect(mockPrisma.match.update).toHaveBeenCalledWith({
                    where: { id: 'next-match' },
                    data: { [expectedSlot]: 'winner-id' },
                });
            });
        });
    });
});

describe('Match Winner Determination', () => {
    it('correctly identifies winner in various score scenarios', () => {
        const scenarios = [
            { score1: 10, score2: 5, winner: 'player1' },
            { score1: 5, score2: 10, winner: 'player2' },
            { score1: 10, score2: 10, winner: null },
            { score1: 0, score2: 1, winner: 'player2' },
            { score1: 1, score2: 0, winner: 'player1' },
            { score1: 0, score2: 0, winner: null },
            { score1: 100, score2: 99, winner: 'player1' },
        ];

        scenarios.forEach(({ score1, score2, winner }) => {
            const result = score1 > score2 ? 'player1' : (score2 > score1 ? 'player2' : null);
            expect(result).toBe(winner);
        });
    });
});
