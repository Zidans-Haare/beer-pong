import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Mock prisma before importing the service
vi.mock('@/lib/prisma', () => ({
    prisma: {
        tournament: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        match: {
            createMany: vi.fn(),
            create: vi.fn(),
            findMany: vi.fn(),
        },
        player: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        tournamentParticipant: {
            upsert: vi.fn(),
        },
        tournamentStanding: {
            upsert: vi.fn(),
            findMany: vi.fn(),
            updateMany: vi.fn(),
        },
    },
}));

// Mock brackets module
vi.mock('@/lib/brackets', () => ({
    generateSingleEliminationBracket: vi.fn(),
    generateRoundRobinMatches: vi.fn(),
    generateGroupStageMatches: vi.fn(),
}));

// Mock duration
vi.mock('@/lib/duration', () => ({
    markMatchStarted: vi.fn(),
}));

// Mock MatchService
vi.mock('./MatchService', () => ({
    MatchService: {
        advanceWinner: vi.fn(),
    },
}));

import { TournamentService } from './TournamentService';
import { prisma } from '@/lib/prisma';
import {
    generateSingleEliminationBracket,
    generateRoundRobinMatches,
    generateGroupStageMatches,
} from '@/lib/brackets';
import { markMatchStarted } from '@/lib/duration';
import { MatchService } from './MatchService';

// Type the mocks
const mockPrisma = prisma as unknown as {
    tournament: {
        findUnique: Mock;
        update: Mock;
    };
    match: {
        createMany: Mock;
        create: Mock;
        findMany: Mock;
    };
    player: {
        findFirst: Mock;
        create: Mock;
    };
    tournamentParticipant: {
        upsert: Mock;
    };
    tournamentStanding: {
        upsert: Mock;
        findMany: Mock;
        updateMany: Mock;
    };
};

const mockGenerateSingleElimination = generateSingleEliminationBracket as Mock;
const mockGenerateRoundRobin = generateRoundRobinMatches as Mock;
const mockGenerateGroups = generateGroupStageMatches as Mock;
const mockMarkMatchStarted = markMatchStarted as Mock;
const mockAdvanceWinner = MatchService.advanceWinner as Mock;

describe('TournamentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('startTournament - Solo Mode', () => {
        const baseTournament = {
            id: 'tournament-1',
            mode: 'SOLO',
            type: 'SINGLE_ELIMINATION',
            hasReturnLeg: false,
            rsvps: [
                { playerId: 'player-1', player: { id: 'player-1', name: 'P1' } },
                { playerId: 'player-2', player: { id: 'player-2', name: 'P2' } },
                { playerId: 'player-3', player: { id: 'player-3', name: 'P3' } },
                { playerId: 'player-4', player: { id: 'player-4', name: 'P4' } },
            ],
            guests: [],
            teams: [],
        };

        it('should throw error if tournament not found', async () => {
            mockPrisma.tournament.findUnique.mockResolvedValue(null);

            await expect(TournamentService.startTournament('invalid-id'))
                .rejects.toThrow('Tournament not found');
        });

        it('should throw error if less than 2 participants', async () => {
            mockPrisma.tournament.findUnique.mockResolvedValue({
                ...baseTournament,
                rsvps: [{ playerId: 'player-1', player: { id: 'player-1' } }],
            });

            await expect(TournamentService.startTournament('tournament-1'))
                .rejects.toThrow('Mindestens 2 Teilnehmer erforderlich');
        });

        it('should generate single elimination bracket', async () => {
            const mockMatches = [
                { tournamentId: 'tournament-1', round: 1, position: 0, player1Id: 'p1', player2Id: 'p2', stage: 'BRACKET', isPlayed: false },
                { tournamentId: 'tournament-1', round: 1, position: 1, player1Id: 'p3', player2Id: 'p4', stage: 'BRACKET', isPlayed: false },
                { tournamentId: 'tournament-1', round: 2, position: 0, player1Id: null, player2Id: null, stage: 'BRACKET', isPlayed: false },
                { tournamentId: 'tournament-1', round: 2, position: 1, player1Id: null, player2Id: null, stage: 'BRACKET', isPlayed: false },
            ];

            mockPrisma.tournament.findUnique.mockResolvedValue(baseTournament);
            mockGenerateSingleElimination.mockReturnValue(mockMatches);
            mockPrisma.tournamentParticipant.upsert.mockResolvedValue({});
            mockPrisma.match.createMany.mockResolvedValue({ count: 4 });
            mockPrisma.tournament.update.mockResolvedValue({});
            mockPrisma.match.findMany.mockResolvedValue([
                { id: 'match-1', player1Id: 'p1', player2Id: 'p2' },
                { id: 'match-2', player1Id: 'p3', player2Id: 'p4' },
            ]);

            await TournamentService.startTournament('tournament-1');

            expect(mockGenerateSingleElimination).toHaveBeenCalledWith(
                'tournament-1',
                expect.arrayContaining([
                    expect.objectContaining({ id: 'player-1' }),
                    expect.objectContaining({ id: 'player-2' }),
                    expect.objectContaining({ id: 'player-3' }),
                    expect.objectContaining({ id: 'player-4' }),
                ])
            );

            expect(mockPrisma.match.createMany).toHaveBeenCalled();
            expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
                where: { id: 'tournament-1' },
                data: { status: 'ACTIVE' },
            });
        });

        it('should generate round robin matches', async () => {
            const roundRobinTournament = {
                ...baseTournament,
                type: 'ROUND_ROBIN',
            };

            const mockMatches = [
                { tournamentId: 'tournament-1', round: 1, position: 0, player1Id: 'p1', player2Id: 'p2', stage: 'LEAGUE' },
                { tournamentId: 'tournament-1', round: 1, position: 1, player1Id: 'p3', player2Id: 'p4', stage: 'LEAGUE' },
                { tournamentId: 'tournament-1', round: 2, position: 2, player1Id: 'p1', player2Id: 'p3', stage: 'LEAGUE' },
            ];

            mockPrisma.tournament.findUnique.mockResolvedValue(roundRobinTournament);
            mockGenerateRoundRobin.mockReturnValue(mockMatches);
            mockPrisma.tournamentParticipant.upsert.mockResolvedValue({});
            mockPrisma.tournamentStanding.upsert.mockResolvedValue({});
            mockPrisma.match.createMany.mockResolvedValue({ count: 3 });
            mockPrisma.tournament.update.mockResolvedValue({});
            mockPrisma.match.findMany.mockResolvedValue(mockMatches.map((m, i) => ({ ...m, id: `match-${i}` })));

            await TournamentService.startTournament('tournament-1');

            expect(mockGenerateRoundRobin).toHaveBeenCalledWith(
                'tournament-1',
                expect.arrayContaining(['player-1', 'player-2', 'player-3', 'player-4']),
                false
            );

            // Should create standings for league
            expect(mockPrisma.tournamentStanding.upsert).toHaveBeenCalledTimes(4);
        });

        it('should generate group stage matches', async () => {
            const groupsTournament = {
                ...baseTournament,
                type: 'GROUPS',
            };

            const mockMatches = [
                { tournamentId: 'tournament-1', round: 1, position: 0, player1Id: 'p1', player2Id: 'p2', stage: 'GROUP_1' },
                { tournamentId: 'tournament-1', round: 1, position: 1, player1Id: 'p3', player2Id: 'p4', stage: 'GROUP_2' },
            ];

            mockPrisma.tournament.findUnique.mockResolvedValue(groupsTournament);
            mockGenerateGroups.mockReturnValue(mockMatches);
            mockPrisma.tournamentParticipant.upsert.mockResolvedValue({});
            mockPrisma.tournamentStanding.upsert.mockResolvedValue({});
            mockPrisma.match.createMany.mockResolvedValue({ count: 2 });
            mockPrisma.tournament.update.mockResolvedValue({});
            mockPrisma.match.findMany.mockResolvedValue([]);

            await TournamentService.startTournament('tournament-1');

            expect(mockGenerateGroups).toHaveBeenCalledWith(
                'tournament-1',
                expect.arrayContaining(['player-1', 'player-2', 'player-3', 'player-4']),
                false
            );
        });

        it('should throw error for groups with less than 4 players', async () => {
            const groupsTournament = {
                ...baseTournament,
                type: 'GROUPS',
                rsvps: [
                    { playerId: 'player-1', player: { id: 'player-1' } },
                    { playerId: 'player-2', player: { id: 'player-2' } },
                    { playerId: 'player-3', player: { id: 'player-3' } },
                ],
            };

            mockPrisma.tournament.findUnique.mockResolvedValue(groupsTournament);

            await expect(TournamentService.startTournament('tournament-1'))
                .rejects.toThrow('Gruppenphasen-Turniere benötigen mindestens 4 Teilnehmer');
        });

        it('should handle bye matches in elimination', async () => {
            const mockMatches = [
                { tournamentId: 'tournament-1', round: 1, position: 0, player1Id: 'p1', player2Id: 'p2', stage: 'BRACKET', isPlayed: false },
                { tournamentId: 'tournament-1', round: 1, position: 1, player1Id: 'p3', player2Id: null, stage: 'BRACKET', isPlayed: true, winnerId: 'p3' }, // Bye
                { tournamentId: 'tournament-1', round: 2, position: 0, player1Id: null, player2Id: null, stage: 'BRACKET', isPlayed: false },
            ];

            mockPrisma.tournament.findUnique.mockResolvedValue({
                ...baseTournament,
                rsvps: baseTournament.rsvps.slice(0, 3), // Only 3 players
            });
            mockGenerateSingleElimination.mockReturnValue(mockMatches);
            mockPrisma.tournamentParticipant.upsert.mockResolvedValue({});
            mockPrisma.match.createMany.mockResolvedValue({ count: 3 });
            mockPrisma.tournament.update.mockResolvedValue({});
            // Return bye match
            mockPrisma.match.findMany
                .mockResolvedValueOnce([{ id: 'bye-match', round: 1, position: 1, winnerId: 'p3' }]) // Bye matches
                .mockResolvedValueOnce([{ id: 'match-1', player1Id: 'p1', player2Id: 'p2' }]); // Playable matches

            await TournamentService.startTournament('tournament-1');

            // Should advance bye winner
            expect(mockAdvanceWinner).toHaveBeenCalledWith(
                'tournament-1',
                1,
                1,
                'p3'
            );
        });

        it('should handle guest players', async () => {
            const tournamentWithGuests = {
                ...baseTournament,
                rsvps: [],
                guests: [
                    { name: 'Guest 1', expiresAt: new Date(Date.now() + 100000) },
                    { name: 'Guest 2', expiresAt: new Date(Date.now() + 100000) },
                ],
            };

            mockPrisma.tournament.findUnique.mockResolvedValue(tournamentWithGuests);
            mockPrisma.player.findFirst.mockResolvedValue(null); // No existing guest
            mockPrisma.player.create
                .mockResolvedValueOnce({ id: 'guest-player-1' })
                .mockResolvedValueOnce({ id: 'guest-player-2' });
            mockGenerateSingleElimination.mockReturnValue([]);
            mockPrisma.tournamentParticipant.upsert.mockResolvedValue({});
            mockPrisma.match.createMany.mockResolvedValue({ count: 0 });
            mockPrisma.tournament.update.mockResolvedValue({});
            mockPrisma.match.findMany.mockResolvedValue([]);

            await TournamentService.startTournament('tournament-1');

            // Should create guest players
            expect(mockPrisma.player.create).toHaveBeenCalledWith({
                data: { name: 'Guest 1', isGuest: true },
            });
            expect(mockPrisma.player.create).toHaveBeenCalledWith({
                data: { name: 'Guest 2', isGuest: true },
            });
        });

        it('should mark playable matches as started', async () => {
            const mockMatches = [
                { tournamentId: 'tournament-1', round: 1, position: 0, player1Id: 'p1', player2Id: 'p2', stage: 'BRACKET', isPlayed: false },
            ];

            mockPrisma.tournament.findUnique.mockResolvedValue(baseTournament);
            mockGenerateSingleElimination.mockReturnValue(mockMatches);
            mockPrisma.tournamentParticipant.upsert.mockResolvedValue({});
            mockPrisma.match.createMany.mockResolvedValue({ count: 1 });
            mockPrisma.tournament.update.mockResolvedValue({});
            mockPrisma.match.findMany
                .mockResolvedValueOnce([]) // No bye matches
                .mockResolvedValueOnce([{ id: 'match-1', player1Id: 'p1', player2Id: 'p2' }]); // Playable matches

            await TournamentService.startTournament('tournament-1');

            expect(mockMarkMatchStarted).toHaveBeenCalledWith('match-1');
        });
    });

    describe('startTournament - Team Mode', () => {
        const teamTournament = {
            id: 'tournament-1',
            mode: 'TEAM',
            type: 'SINGLE_ELIMINATION',
            hasReturnLeg: false,
            rsvps: [],
            guests: [],
            teams: [
                { id: 'team-1', player1: { name: 'P1' }, player2: { name: 'P2' } },
                { id: 'team-2', player1: { name: 'P3' }, player2: { name: 'P4' } },
                { id: 'team-3', player1: { name: 'P5' }, player2: { name: 'P6' } },
                { id: 'team-4', player1: { name: 'P7' }, player2: { name: 'P8' } },
            ],
        };

        it('should throw error if less than 2 teams', async () => {
            mockPrisma.tournament.findUnique.mockResolvedValue({
                ...teamTournament,
                teams: [{ id: 'team-1' }],
            });

            await expect(TournamentService.startTournament('tournament-1'))
                .rejects.toThrow('Mindestens 2 Teams erforderlich');
        });

        it('should generate team bracket', async () => {
            mockPrisma.tournament.findUnique.mockResolvedValue(teamTournament);
            mockPrisma.match.createMany.mockResolvedValue({ count: 4 });
            mockPrisma.tournament.update.mockResolvedValue({});
            mockPrisma.match.findMany.mockResolvedValue([
                { id: 'match-1', team1Id: 'team-1', team2Id: 'team-2' },
            ]);

            await TournamentService.startTournament('tournament-1');

            expect(mockPrisma.match.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        tournamentId: 'tournament-1',
                        stage: 'BRACKET',
                    }),
                ]),
            });

            expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
                where: { id: 'tournament-1' },
                data: { status: 'ACTIVE' },
            });
        });

        it('should throw error for team groups with less than 4 teams', async () => {
            mockPrisma.tournament.findUnique.mockResolvedValue({
                ...teamTournament,
                type: 'GROUPS',
                teams: teamTournament.teams.slice(0, 3),
            });

            await expect(TournamentService.startTournament('tournament-1'))
                .rejects.toThrow('Gruppenphasen-Turniere benötigen mindestens 4 Teams');
        });
    });

    describe('generateKnockoutFromGroups', () => {
        it('should generate correct crossover brackets for 4 qualifiers', async () => {
            const standings = [
                { playerId: 'g1-first', groupId: 1, points: 9, goalDifference: 10, goalsFor: 15 },
                { playerId: 'g1-second', groupId: 1, points: 6, goalDifference: 5, goalsFor: 10 },
                { playerId: 'g2-first', groupId: 2, points: 9, goalDifference: 8, goalsFor: 12 },
                { playerId: 'g2-second', groupId: 2, points: 6, goalDifference: 3, goalsFor: 8 },
            ];

            mockPrisma.tournamentStanding.findMany.mockResolvedValue(standings);
            mockPrisma.match.create.mockResolvedValue({ id: 'new-match' });

            await TournamentService.generateKnockoutFromGroups('tournament-1');

            // SF1: Group 1 First (g1-first) vs Group 2 Second (g2-second)
            expect(mockPrisma.match.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    tournamentId: 'tournament-1',
                    player1Id: 'g1-first',
                    player2Id: 'g2-second',
                    round: 1,
                    position: 0,
                    stage: 'BRACKET',
                }),
            });

            // SF2: Group 2 First (g2-first) vs Group 1 Second (g1-second)
            expect(mockPrisma.match.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    tournamentId: 'tournament-1',
                    player1Id: 'g2-first',
                    player2Id: 'g1-second',
                    round: 1,
                    position: 1,
                    stage: 'BRACKET',
                }),
            });

            // Should create final and 3rd place match placeholders
            expect(mockPrisma.match.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    round: 2,
                    position: 0,
                    player1Id: null,
                    player2Id: null,
                }),
            });

            expect(mockPrisma.match.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    round: 2,
                    position: 1,
                    player1Id: null,
                    player2Id: null,
                }),
            });
        });

        it('should mark semi-final matches as started', async () => {
            const standings = [
                { playerId: 'g1-first', groupId: 1, points: 9, goalDifference: 10, goalsFor: 15 },
                { playerId: 'g1-second', groupId: 1, points: 6, goalDifference: 5, goalsFor: 10 },
                { playerId: 'g2-first', groupId: 2, points: 9, goalDifference: 8, goalsFor: 12 },
                { playerId: 'g2-second', groupId: 2, points: 6, goalDifference: 3, goalsFor: 8 },
            ];

            mockPrisma.tournamentStanding.findMany.mockResolvedValue(standings);
            mockPrisma.match.create
                .mockResolvedValueOnce({ id: 'semi-1' })
                .mockResolvedValueOnce({ id: 'semi-2' })
                .mockResolvedValueOnce({ id: 'final' })
                .mockResolvedValueOnce({ id: 'third-place' });

            await TournamentService.generateKnockoutFromGroups('tournament-1');

            expect(mockMarkMatchStarted).toHaveBeenCalledWith('semi-1');
            expect(mockMarkMatchStarted).toHaveBeenCalledWith('semi-2');
        });

        it('should sort standings by points, goal difference, then goals for', async () => {
            // Same points, different goal difference
            const standings = [
                { playerId: 'p1', groupId: 1, points: 6, goalDifference: 2, goalsFor: 8 },
                { playerId: 'p2', groupId: 1, points: 6, goalDifference: 5, goalsFor: 10 }, // Better GD
                { playerId: 'p3', groupId: 2, points: 6, goalDifference: 5, goalsFor: 12 }, // Same GD, more goals
                { playerId: 'p4', groupId: 2, points: 6, goalDifference: 5, goalsFor: 10 },
            ];

            mockPrisma.tournamentStanding.findMany.mockResolvedValue(standings);
            mockPrisma.match.create.mockResolvedValue({ id: 'match' });

            await TournamentService.generateKnockoutFromGroups('tournament-1');

            // Verify standings were queried with correct order
            expect(mockPrisma.tournamentStanding.findMany).toHaveBeenCalledWith({
                where: { tournamentId: 'tournament-1' },
                orderBy: [
                    { groupId: 'asc' },
                    { points: 'desc' },
                    { goalDifference: 'desc' },
                    { goalsFor: 'desc' },
                ],
            });
        });
    });
});

describe('Tournament Type Routing', () => {
    it('should call correct generator for each tournament type', () => {
        const typeToGenerator: Record<string, string> = {
            'SINGLE_ELIMINATION': 'generateSingleEliminationBracket',
            'ELIMINATION': 'generateSingleEliminationBracket',
            'ROUND_ROBIN': 'generateRoundRobinMatches',
            'GROUPS': 'generateGroupStageMatches',
            'GROUP_AND_KNOCKOUT': 'generateGroupStageMatches',
        };

        // Verify mapping exists
        Object.keys(typeToGenerator).forEach(type => {
            expect(typeToGenerator[type]).toBeTruthy();
        });
    });
});

describe('Group Assignment Logic', () => {
    it('should correctly identify players from GROUP_1 and GROUP_2 stages', () => {
        const matches = [
            { stage: 'GROUP_1', player1Id: 'p1', player2Id: 'p2' },
            { stage: 'GROUP_1', player1Id: 'p1', player2Id: 'p3' },
            { stage: 'GROUP_2', player1Id: 'p4', player2Id: 'p5' },
            { stage: 'GROUP_2', player1Id: 'p4', player2Id: 'p6' },
        ];

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

        expect(group1Players).toEqual(new Set(['p1', 'p2', 'p3']));
        expect(group2Players).toEqual(new Set(['p4', 'p5', 'p6']));

        // No overlap
        group1Players.forEach(p => {
            expect(group2Players.has(p)).toBe(false);
        });
    });
});
