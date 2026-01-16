/**
 * TURNIER-SIMULATION
 *
 * Simuliert komplette Turniere wie im Dry-Run:
 * - 8-9 Spieler
 * - 2 Tische
 * - Gruppenphase (2 Gruppen) → Halbfinale → Finale → 3. Platz
 * - ODER: Round Robin → Halbfinale → Finale → 3. Platz
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// ============================================================
// MOCK SETUP
// ============================================================

vi.mock('@/lib/prisma', () => ({
    prisma: {
        tournament: {
            findUnique: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
        },
        match: {
            createMany: vi.fn(),
            create: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            count: vi.fn(),
        },
        player: {
            findFirst: vi.fn(),
            create: vi.fn(),
            findMany: vi.fn(),
        },
        tournamentParticipant: {
            upsert: vi.fn(),
        },
        tournamentStanding: {
            upsert: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        rsvp: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock('./services/TickerService', () => ({
    TickerService: {
        createEvent: vi.fn(),
        triggerCommentary: vi.fn(),
    },
}));

vi.mock('./duration', () => ({
    recordMatchDuration: vi.fn(),
    markMatchStarted: vi.fn(),
}));

// ============================================================
// PURE LOGIC SIMULATION (No Database)
// ============================================================

import {
    generateSingleEliminationBracket,
    generateRoundRobinMatches,
    generateGroupStageMatches,
    MatchInput
} from './brackets';

// Types
interface SimPlayer {
    id: string;
    name: string;
}

interface SimMatch extends MatchInput {
    score1?: number;
    score2?: number;
}

interface SimStanding {
    playerId: string;
    playerName: string;
    groupId: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
}

// Create test players
const createSimPlayers = (count: number): SimPlayer[] =>
    Array.from({ length: count }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Spieler ${i + 1}`
    }));

// Simulate match result
const playMatch = (match: SimMatch, score1: number, score2: number): SimMatch => {
    const winnerId = score1 > score2 ? match.player1Id : (score2 > score1 ? match.player2Id : null);
    return {
        ...match,
        score1,
        score2,
        isPlayed: true,
        winnerId
    };
};

// Update standings after a match
const updateStanding = (
    standings: SimStanding[],
    playerId: string,
    goalsFor: number,
    goalsAgainst: number,
    result: 'win' | 'draw' | 'loss'
): SimStanding[] => {
    return standings.map(s => {
        if (s.playerId !== playerId) return s;
        return {
            ...s,
            played: s.played + 1,
            won: s.won + (result === 'win' ? 1 : 0),
            drawn: s.drawn + (result === 'draw' ? 1 : 0),
            lost: s.lost + (result === 'loss' ? 1 : 0),
            goalsFor: s.goalsFor + goalsFor,
            goalsAgainst: s.goalsAgainst + goalsAgainst,
            goalDifference: s.goalDifference + (goalsFor - goalsAgainst),
            points: s.points + (result === 'win' ? 3 : result === 'draw' ? 1 : 0)
        };
    });
};

// Advance winner to next bracket round
const advanceWinner = (matches: SimMatch[], currentMatch: SimMatch): SimMatch[] => {
    if (!currentMatch.winnerId) return matches;

    const nextRound = currentMatch.round + 1;
    const nextPosition = Math.floor(currentMatch.position / 2);
    const isPlayer1 = currentMatch.position % 2 === 0;

    return matches.map(m => {
        if (m.round === nextRound && m.position === nextPosition && m.stage === 'BRACKET') {
            return {
                ...m,
                [isPlayer1 ? 'player1Id' : 'player2Id']: currentMatch.winnerId
            };
        }
        return m;
    });
};

// Advance loser to 3rd place match
const advanceLoserTo3rdPlace = (matches: SimMatch[], semiMatch: SimMatch, maxRound: number): SimMatch[] => {
    const loserId = semiMatch.winnerId === semiMatch.player1Id
        ? semiMatch.player2Id
        : semiMatch.player1Id;

    const isPlayer1 = semiMatch.position % 2 === 0;

    return matches.map(m => {
        if (m.round === maxRound && m.position === 1 && m.stage === 'BRACKET') {
            return {
                ...m,
                [isPlayer1 ? 'player1Id' : 'player2Id']: loserId
            };
        }
        return m;
    });
};

// Get playable matches
const getPlayableMatches = (matches: SimMatch[]): SimMatch[] =>
    matches.filter(m => m.player1Id && m.player2Id && !m.isPlayed);

// Sort standings
const sortStandings = (standings: SimStanding[]): SimStanding[] =>
    [...standings].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });

// ============================================================
// SCENARIO 1: GRUPPENPHASE → PLAYOFFS (8 Spieler)
// ============================================================

describe('🏆 Szenario 1: Gruppenphase mit 8 Spielern', () => {
    const tournamentId = 'sim-tournament-groups';
    let players: SimPlayer[];
    let matches: SimMatch[];
    let standings: SimStanding[];

    beforeEach(() => {
        players = createSimPlayers(8);
        matches = generateGroupStageMatches(tournamentId, players.map(p => p.id), false) as SimMatch[];

        // Initialize standings
        standings = [];
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

        group1Players.forEach(pid => {
            const player = players.find(p => p.id === pid)!;
            standings.push({
                playerId: pid,
                playerName: player.name,
                groupId: 1,
                played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
            });
        });

        group2Players.forEach(pid => {
            const player = players.find(p => p.id === pid)!;
            standings.push({
                playerId: pid,
                playerName: player.name,
                groupId: 2,
                played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
            });
        });
    });

    it('sollte korrekte Anzahl Gruppenspiele generieren', () => {
        // 4 Spieler pro Gruppe = 6 Matches pro Gruppe
        const g1Matches = matches.filter(m => m.stage === 'GROUP_1');
        const g2Matches = matches.filter(m => m.stage === 'GROUP_2');

        expect(g1Matches.length).toBe(6);
        expect(g2Matches.length).toBe(6);
        expect(matches.length).toBe(12);

        console.log('\n📊 GRUPPENPHASE STRUKTUR:');
        console.log(`   Gruppe 1: ${g1Matches.length} Spiele`);
        console.log(`   Gruppe 2: ${g2Matches.length} Spiele`);
        console.log(`   Gesamt: ${matches.length} Spiele`);
    });

    it('sollte komplette Gruppenphase durchspielen', () => {
        console.log('\n🎮 GRUPPENPHASE SIMULATION:');
        console.log('=' .repeat(60));

        // Simulate random results for all group matches
        const simulatedScores = [
            [10, 5], [7, 10], [10, 3], [6, 6], [10, 8], [4, 10],
            [10, 7], [8, 10], [10, 4], [5, 5], [10, 6], [3, 10]
        ];

        matches.forEach((match, idx) => {
            if (!match.player1Id || !match.player2Id) return;

            const [s1, s2] = simulatedScores[idx] || [10, 5];
            matches[idx] = playMatch(match, s1, s2);

            // Update standings
            const result1 = s1 > s2 ? 'win' : s1 < s2 ? 'loss' : 'draw';
            const result2 = s2 > s1 ? 'win' : s2 < s1 ? 'loss' : 'draw';

            standings = updateStanding(standings, match.player1Id, s1, s2, result1);
            standings = updateStanding(standings, match.player2Id, s2, s1, result2);

            const p1Name = players.find(p => p.id === match.player1Id)?.name || 'TBD';
            const p2Name = players.find(p => p.id === match.player2Id)?.name || 'TBD';
            console.log(`   ${match.stage}: ${p1Name} ${s1}:${s2} ${p2Name}`);
        });

        // All group matches should be played
        const unplayed = matches.filter(m => !m.isPlayed);
        expect(unplayed.length).toBe(0);

        // Show final standings
        console.log('\n📈 GRUPPEN-TABELLEN:');

        const g1Standings = sortStandings(standings.filter(s => s.groupId === 1));
        const g2Standings = sortStandings(standings.filter(s => s.groupId === 2));

        console.log('\n   GRUPPE 1:');
        console.log('   Pl | Spieler      | Sp | S | U | N | Tore  | Diff | Pkt');
        console.log('   ' + '-'.repeat(58));
        g1Standings.forEach((s, i) => {
            console.log(`   ${i + 1}. | ${s.playerName.padEnd(12)} | ${s.played}  | ${s.won} | ${s.drawn} | ${s.lost} | ${s.goalsFor}:${s.goalsAgainst}  | ${s.goalDifference >= 0 ? '+' : ''}${s.goalDifference}  | ${s.points}`);
        });

        console.log('\n   GRUPPE 2:');
        console.log('   Pl | Spieler      | Sp | S | U | N | Tore  | Diff | Pkt');
        console.log('   ' + '-'.repeat(58));
        g2Standings.forEach((s, i) => {
            console.log(`   ${i + 1}. | ${s.playerName.padEnd(12)} | ${s.played}  | ${s.won} | ${s.drawn} | ${s.lost} | ${s.goalsFor}:${s.goalsAgainst}  | ${s.goalDifference >= 0 ? '+' : ''}${s.goalDifference}  | ${s.points}`);
        });

        // Each player should have played 3 matches
        standings.forEach(s => {
            expect(s.played).toBe(3);
        });
    });

    it('sollte Playoffs aus Gruppenergebnissen generieren', () => {
        // First play all group matches
        const scores = [
            [10, 5], [7, 10], [10, 3], [6, 6], [10, 8], [4, 10],
            [10, 7], [8, 10], [10, 4], [5, 5], [10, 6], [3, 10]
        ];

        matches.forEach((match, idx) => {
            if (!match.player1Id || !match.player2Id) return;
            const [s1, s2] = scores[idx];
            matches[idx] = playMatch(match, s1, s2);

            const result1 = s1 > s2 ? 'win' : s1 < s2 ? 'loss' : 'draw';
            const result2 = s2 > s1 ? 'win' : s2 < s1 ? 'loss' : 'draw';
            standings = updateStanding(standings, match.player1Id, s1, s2, result1);
            standings = updateStanding(standings, match.player2Id, s2, s1, result2);
        });

        // Get qualifiers (Top 2 from each group)
        const g1Sorted = sortStandings(standings.filter(s => s.groupId === 1));
        const g2Sorted = sortStandings(standings.filter(s => s.groupId === 2));

        const g1First = g1Sorted[0];
        const g1Second = g1Sorted[1];
        const g2First = g2Sorted[0];
        const g2Second = g2Sorted[1];

        console.log('\n🏅 PLAYOFF-QUALIFIKATION:');
        console.log(`   G1-1.: ${g1First.playerName} (${g1First.points} Pkt)`);
        console.log(`   G1-2.: ${g1Second.playerName} (${g1Second.points} Pkt)`);
        console.log(`   G2-1.: ${g2First.playerName} (${g2First.points} Pkt)`);
        console.log(`   G2-2.: ${g2Second.playerName} (${g2Second.points} Pkt)`);

        // Generate knockout bracket
        const knockoutMatches: SimMatch[] = [
            // Semifinals (Crossover: G1-1 vs G2-2, G2-1 vs G1-2)
            {
                tournamentId,
                round: 1,
                position: 0,
                stage: 'BRACKET',
                player1Id: g1First.playerId,
                player2Id: g2Second.playerId,
                isPlayed: false
            },
            {
                tournamentId,
                round: 1,
                position: 1,
                stage: 'BRACKET',
                player1Id: g2First.playerId,
                player2Id: g1Second.playerId,
                isPlayed: false
            },
            // Final
            {
                tournamentId,
                round: 2,
                position: 0,
                stage: 'BRACKET',
                player1Id: null,
                player2Id: null,
                isPlayed: false
            },
            // 3rd Place
            {
                tournamentId,
                round: 2,
                position: 1,
                stage: 'BRACKET',
                player1Id: null,
                player2Id: null,
                isPlayed: false
            }
        ];

        console.log('\n⚔️ HALBFINALE:');
        console.log(`   HF1: ${g1First.playerName} vs ${g2Second.playerName}`);
        console.log(`   HF2: ${g2First.playerName} vs ${g1Second.playerName}`);

        // Play semifinals
        let ko = knockoutMatches;

        // HF1: G1-1 wins
        ko[0] = playMatch(ko[0], 10, 7);
        ko = advanceWinner(ko, ko[0]);
        ko = advanceLoserTo3rdPlace(ko, ko[0], 2);

        // HF2: G2-1 wins
        ko[1] = playMatch(ko[1], 10, 5);
        ko = advanceWinner(ko, ko[1]);
        ko = advanceLoserTo3rdPlace(ko, ko[1], 2);

        console.log(`   HF1 Ergebnis: ${g1First.playerName} 10:7 ${g2Second.playerName} → ${g1First.playerName} weiter`);
        console.log(`   HF2 Ergebnis: ${g2First.playerName} 10:5 ${g1Second.playerName} → ${g2First.playerName} weiter`);

        // Verify final participants
        const final = ko.find(m => m.round === 2 && m.position === 0)!;
        const thirdPlace = ko.find(m => m.round === 2 && m.position === 1)!;

        expect(final.player1Id).toBe(g1First.playerId);
        expect(final.player2Id).toBe(g2First.playerId);
        expect(thirdPlace.player1Id).toBe(g2Second.playerId);
        expect(thirdPlace.player2Id).toBe(g1Second.playerId);

        console.log('\n🏆 FINALE:');
        console.log(`   ${g1First.playerName} vs ${g2First.playerName}`);

        console.log('\n🥉 SPIEL UM PLATZ 3:');
        console.log(`   ${g2Second.playerName} vs ${g1Second.playerName}`);

        // Play final and 3rd place
        const finalIdx = ko.findIndex(m => m.round === 2 && m.position === 0);
        const thirdIdx = ko.findIndex(m => m.round === 2 && m.position === 1);

        ko[finalIdx] = playMatch(ko[finalIdx], 10, 8);
        ko[thirdIdx] = playMatch(ko[thirdIdx], 10, 6);

        const winner = players.find(p => p.id === ko[finalIdx].winnerId)!;
        const runnerUp = players.find(p => p.id === (ko[finalIdx].winnerId === ko[finalIdx].player1Id ? ko[finalIdx].player2Id : ko[finalIdx].player1Id))!;
        const third = players.find(p => p.id === ko[thirdIdx].winnerId)!;
        const fourth = players.find(p => p.id === (ko[thirdIdx].winnerId === ko[thirdIdx].player1Id ? ko[thirdIdx].player2Id : ko[thirdIdx].player1Id))!;

        console.log('\n🎊 ENDERGEBNIS:');
        console.log(`   🥇 1. Platz: ${winner.name}`);
        console.log(`   🥈 2. Platz: ${runnerUp.name}`);
        console.log(`   🥉 3. Platz: ${third.name}`);
        console.log(`   4. Platz: ${fourth.name}`);

        // All knockout matches should be played
        expect(ko.every(m => m.isPlayed)).toBe(true);
    });
});

// ============================================================
// SCENARIO 2: ROUND ROBIN → PLAYOFFS (8 Spieler)
// ============================================================

describe('🏆 Szenario 2: Jeder gegen Jeden mit 8 Spielern', () => {
    const tournamentId = 'sim-tournament-rr';
    let players: SimPlayer[];
    let matches: SimMatch[];
    let standings: SimStanding[];

    beforeEach(() => {
        players = createSimPlayers(8);
        matches = generateRoundRobinMatches(tournamentId, players.map(p => p.id), false) as SimMatch[];

        standings = players.map(p => ({
            playerId: p.id,
            playerName: p.name,
            groupId: 0,
            played: 0, won: 0, drawn: 0, lost: 0,
            goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
        }));
    });

    it('sollte korrekte Anzahl Spiele generieren', () => {
        // 8 Spieler = 28 Matches (8*7/2)
        expect(matches.length).toBe(28);

        console.log('\n📊 ROUND ROBIN STRUKTUR:');
        console.log(`   Spieler: 8`);
        console.log(`   Spiele gesamt: ${matches.length}`);
        console.log(`   Spiele pro Spieler: 7`);
        console.log(`   Runden: 7`);
    });

    it('sollte komplettes Round Robin durchspielen', () => {
        console.log('\n🎮 ROUND ROBIN SIMULATION:');
        console.log('=' .repeat(60));

        // Random but deterministic results
        let matchCount = 0;
        matches.forEach((match, idx) => {
            if (!match.player1Id || !match.player2Id) return;

            // Generate pseudo-random scores based on player IDs
            const s1 = 5 + (idx % 6);
            const s2 = 3 + ((idx + 3) % 7);

            matches[idx] = playMatch(match, s1, s2);

            const result1 = s1 > s2 ? 'win' : s1 < s2 ? 'loss' : 'draw';
            const result2 = s2 > s1 ? 'win' : s2 < s1 ? 'loss' : 'draw';

            standings = updateStanding(standings, match.player1Id, s1, s2, result1);
            standings = updateStanding(standings, match.player2Id, s2, s1, result2);

            matchCount++;
        });

        console.log(`   ${matchCount} Spiele gespielt`);

        // Show final standings
        const sorted = sortStandings(standings);

        console.log('\n📈 ENDTABELLE:');
        console.log('   Pl | Spieler      | Sp | S | U | N | Tore   | Diff | Pkt');
        console.log('   ' + '-'.repeat(60));
        sorted.forEach((s, i) => {
            const diffStr = s.goalDifference >= 0 ? `+${s.goalDifference}` : `${s.goalDifference}`;
            console.log(`   ${(i + 1).toString().padStart(2)}. | ${s.playerName.padEnd(12)} | ${s.played}  | ${s.won} | ${s.drawn} | ${s.lost} | ${s.goalsFor.toString().padStart(2)}:${s.goalsAgainst.toString().padStart(2)}  | ${diffStr.padStart(3)}  | ${s.points.toString().padStart(2)}`);
        });

        // All matches played
        expect(matches.every(m => m.isPlayed)).toBe(true);

        // Each player played 7 matches
        standings.forEach(s => {
            expect(s.played).toBe(7);
        });
    });

    it('sollte Playoffs aus Liga-Ergebnissen generieren (Top 4)', () => {
        // Play all matches first
        matches.forEach((match, idx) => {
            if (!match.player1Id || !match.player2Id) return;
            const s1 = 5 + (idx % 6);
            const s2 = 3 + ((idx + 3) % 7);
            matches[idx] = playMatch(match, s1, s2);

            const result1 = s1 > s2 ? 'win' : s1 < s2 ? 'loss' : 'draw';
            const result2 = s2 > s1 ? 'win' : s2 < s1 ? 'loss' : 'draw';
            standings = updateStanding(standings, match.player1Id, s1, s2, result1);
            standings = updateStanding(standings, match.player2Id, s2, s1, result2);
        });

        // Get Top 4
        const sorted = sortStandings(standings);
        const top4 = sorted.slice(0, 4);

        console.log('\n🏅 TOP 4 FÜR PLAYOFFS:');
        top4.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s.playerName} (${s.points} Pkt, ${s.goalDifference >= 0 ? '+' : ''}${s.goalDifference} Diff)`);
        });

        // Generate knockout
        const knockoutMatches: SimMatch[] = [
            // SF: 1st vs 4th, 2nd vs 3rd
            {
                tournamentId,
                round: 1,
                position: 0,
                stage: 'BRACKET',
                player1Id: top4[0].playerId,
                player2Id: top4[3].playerId,
                isPlayed: false
            },
            {
                tournamentId,
                round: 1,
                position: 1,
                stage: 'BRACKET',
                player1Id: top4[1].playerId,
                player2Id: top4[2].playerId,
                isPlayed: false
            },
            // Final
            {
                tournamentId,
                round: 2,
                position: 0,
                stage: 'BRACKET',
                player1Id: null,
                player2Id: null,
                isPlayed: false
            },
            // 3rd Place
            {
                tournamentId,
                round: 2,
                position: 1,
                stage: 'BRACKET',
                player1Id: null,
                player2Id: null,
                isPlayed: false
            }
        ];

        console.log('\n⚔️ HALBFINALE:');
        console.log(`   HF1: ${top4[0].playerName} (1.) vs ${top4[3].playerName} (4.)`);
        console.log(`   HF2: ${top4[1].playerName} (2.) vs ${top4[2].playerName} (3.)`);

        // Play knockouts
        let ko = knockoutMatches;

        ko[0] = playMatch(ko[0], 10, 6);
        ko = advanceWinner(ko, ko[0]);
        ko = advanceLoserTo3rdPlace(ko, ko[0], 2);

        ko[1] = playMatch(ko[1], 8, 10);
        ko = advanceWinner(ko, ko[1]);
        ko = advanceLoserTo3rdPlace(ko, ko[1], 2);

        const sf1Winner = players.find(p => p.id === ko[0].winnerId)!;
        const sf2Winner = players.find(p => p.id === ko[1].winnerId)!;

        console.log(`   HF1: ${top4[0].playerName} 10:6 ${top4[3].playerName} → ${sf1Winner.name} weiter`);
        console.log(`   HF2: ${top4[1].playerName} 8:10 ${top4[2].playerName} → ${sf2Winner.name} weiter`);

        // Final & 3rd Place
        const final = ko.find(m => m.round === 2 && m.position === 0)!;
        const thirdPlace = ko.find(m => m.round === 2 && m.position === 1)!;

        console.log('\n🏆 FINALE:');
        const finalist1 = players.find(p => p.id === final.player1Id)!;
        const finalist2 = players.find(p => p.id === final.player2Id)!;
        console.log(`   ${finalist1.name} vs ${finalist2.name}`);

        console.log('\n🥉 SPIEL UM PLATZ 3:');
        const third1 = players.find(p => p.id === thirdPlace.player1Id)!;
        const third2 = players.find(p => p.id === thirdPlace.player2Id)!;
        console.log(`   ${third1.name} vs ${third2.name}`);

        // Play final matches
        const finalIdx = ko.findIndex(m => m.round === 2 && m.position === 0);
        const thirdIdx = ko.findIndex(m => m.round === 2 && m.position === 1);

        ko[finalIdx] = playMatch(ko[finalIdx], 10, 9);
        ko[thirdIdx] = playMatch(ko[thirdIdx], 7, 10);

        const winner = players.find(p => p.id === ko[finalIdx].winnerId)!;
        const runnerUp = players.find(p => p.id === (ko[finalIdx].winnerId === ko[finalIdx].player1Id ? ko[finalIdx].player2Id : ko[finalIdx].player1Id))!;
        const third = players.find(p => p.id === ko[thirdIdx].winnerId)!;
        const fourth = players.find(p => p.id === (ko[thirdIdx].winnerId === ko[thirdIdx].player1Id ? ko[thirdIdx].player2Id : ko[thirdIdx].player1Id))!;

        console.log('\n🎊 ENDERGEBNIS:');
        console.log(`   🥇 1. Platz: ${winner.name}`);
        console.log(`   🥈 2. Platz: ${runnerUp.name}`);
        console.log(`   🥉 3. Platz: ${third.name}`);
        console.log(`   4. Platz: ${fourth.name}`);

        expect(ko.every(m => m.isPlayed)).toBe(true);
    });
});

// ============================================================
// SCENARIO 3: 9 Spieler Gruppenphase (ungleiche Gruppen)
// ============================================================

describe('🏆 Szenario 3: Gruppenphase mit 9 Spielern (ungleiche Gruppen)', () => {
    const tournamentId = 'sim-tournament-9';
    let players: SimPlayer[];
    let matches: SimMatch[];

    beforeEach(() => {
        players = createSimPlayers(9);
        matches = generateGroupStageMatches(tournamentId, players.map(p => p.id), false) as SimMatch[];
    });

    it('sollte ungleiche Gruppen korrekt aufteilen', () => {
        const g1Matches = matches.filter(m => m.stage === 'GROUP_1');
        const g2Matches = matches.filter(m => m.stage === 'GROUP_2');

        // Group 1: 4 players = 6 matches
        // Group 2: 5 players = 10 matches
        console.log('\n📊 9 SPIELER GRUPPENPHASE:');
        console.log(`   Gruppe 1: ${new Set([...g1Matches.map(m => m.player1Id), ...g1Matches.map(m => m.player2Id)].filter(Boolean)).size} Spieler, ${g1Matches.length} Spiele`);
        console.log(`   Gruppe 2: ${new Set([...g2Matches.map(m => m.player1Id), ...g2Matches.map(m => m.player2Id)].filter(Boolean)).size} Spieler, ${g2Matches.length} Spiele`);

        expect(g1Matches.length).toBe(6);  // 4 players
        expect(g2Matches.length).toBe(10); // 5 players
        expect(matches.length).toBe(16);
    });
});

// ============================================================
// TIMING SIMULATION (2 Tische)
// ============================================================

describe('⏱️ Zeitplanung mit 2 Tischen', () => {
    it('sollte Parallelspiele für Gruppenphase berechnen', () => {
        const matches = 12; // 8 players, 2 groups
        const tables = 2;
        const matchDuration = 15; // minutes

        const parallelRounds = Math.ceil(matches / tables);
        const totalTime = parallelRounds * matchDuration;

        console.log('\n⏱️ ZEITPLANUNG GRUPPENPHASE (8 Spieler):');
        console.log(`   Spiele: ${matches}`);
        console.log(`   Tische: ${tables}`);
        console.log(`   Spieldauer: ${matchDuration} min`);
        console.log(`   Parallele Runden: ${parallelRounds}`);
        console.log(`   Geschätzte Gesamtzeit: ${totalTime} min (${(totalTime / 60).toFixed(1)} h)`);

        expect(parallelRounds).toBe(6);
        expect(totalTime).toBe(90); // 1.5 hours
    });

    it('sollte Parallelspiele für Round Robin berechnen', () => {
        const matches = 28; // 8 players
        const tables = 2;
        const matchDuration = 15;

        const parallelRounds = Math.ceil(matches / tables);
        const totalTime = parallelRounds * matchDuration;

        console.log('\n⏱️ ZEITPLANUNG ROUND ROBIN (8 Spieler):');
        console.log(`   Spiele: ${matches}`);
        console.log(`   Tische: ${tables}`);
        console.log(`   Parallele Runden: ${parallelRounds}`);
        console.log(`   Geschätzte Gesamtzeit: ${totalTime} min (${(totalTime / 60).toFixed(1)} h)`);

        expect(parallelRounds).toBe(14);
        expect(totalTime).toBe(210); // 3.5 hours
    });

    it('sollte Playoff-Zeit berechnen', () => {
        const playoffMatches = 4; // 2 SF + Final + 3rd Place
        const tables = 2;
        const matchDuration = 15;

        // SF can be parallel, Final + 3rd can be parallel
        const parallelRounds = 2;
        const totalTime = parallelRounds * matchDuration;

        console.log('\n⏱️ ZEITPLANUNG PLAYOFFS:');
        console.log(`   Spiele: ${playoffMatches} (2 HF + Finale + 3. Platz)`);
        console.log(`   Tische: ${tables}`);
        console.log(`   Parallele Runden: ${parallelRounds}`);
        console.log(`   Geschätzte Gesamtzeit: ${totalTime} min`);

        expect(totalTime).toBe(30);
    });

    it('sollte Gesamtzeit für komplettes Turnier berechnen', () => {
        console.log('\n📅 GESAMTPLANUNG:');

        // Scenario 1: Groups + Playoffs
        const groupTime = 90;
        const playoffTime = 30;
        const bufferTime = 15;
        const total1 = groupTime + playoffTime + bufferTime;

        console.log('\n   SZENARIO 1 (Gruppenphase + Playoffs):');
        console.log(`   Gruppenphase: ${groupTime} min`);
        console.log(`   Playoffs: ${playoffTime} min`);
        console.log(`   Puffer: ${bufferTime} min`);
        console.log(`   GESAMT: ${total1} min (${(total1 / 60).toFixed(1)} h)`);

        // Scenario 2: Round Robin + Playoffs
        const rrTime = 210;
        const total2 = rrTime + playoffTime + bufferTime;

        console.log('\n   SZENARIO 2 (Round Robin + Playoffs):');
        console.log(`   Liga: ${rrTime} min`);
        console.log(`   Playoffs: ${playoffTime} min`);
        console.log(`   Puffer: ${bufferTime} min`);
        console.log(`   GESAMT: ${total2} min (${(total2 / 60).toFixed(1)} h)`);

        expect(total1).toBeLessThan(total2);
    });
});
