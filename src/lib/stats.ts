import { prisma } from '@/lib/prisma';
import { Player, Match, Tournament } from '@prisma/client';

export interface PlayerStats {
    id: string;
    name: string;
    matchesPlayed: number;
    matchesWon: number;
    tournamentsPlayed: number;
    cupDiff: number; // Total cups hit - Total cups received
    winRate: number;
    history: { date: string; timestamp: number; winRate: number; cupsHit: number }[];
}

export async function getAllPlayerStats(): Promise<PlayerStats[]> {
    const players = await prisma.player.findMany({
        include: {
            matchesAsPlayer1: {
                where: { winnerId: { not: null } },
                include: { tournament: true }
            },
            matchesAsPlayer2: {
                where: { winnerId: { not: null } },
                include: { tournament: true }
            },
            tournaments: true,
        }
    });

    return players.map(p => {
        // combine matches and sort by date
        const allMatches = [
            ...p.matchesAsPlayer1.map(m => ({ ...m, isP1: true })),
            ...p.matchesAsPlayer2.map(m => ({ ...m, isP1: false }))
        ].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

        let matchesWon = 0;
        let cupsHit = 0;
        let cupsReceived = 0;
        const history: { date: string; timestamp: number; winRate: number; cupsHit: number }[] = [];

        allMatches.forEach((m, index) => {
            const isWinner = m.winnerId === p.id;
            if (isWinner) matchesWon++;

            const myScore = m.isP1 ? m.score1 : m.score2;
            const oppScore = m.isP1 ? m.score2 : m.score1;

            cupsHit += myScore;
            cupsReceived += oppScore;

            history.push({
                date: new Date(m.updatedAt).toLocaleDateString(),
                timestamp: new Date(m.updatedAt).getTime(),
                winRate: Math.round((matchesWon / (index + 1)) * 100),
                cupsHit: cupsHit
            });
        });

        const matchesPlayed = allMatches.length;

        return {
            id: p.id,
            name: p.name,
            matchesPlayed,
            matchesWon,
            tournamentsPlayed: p.tournaments.length,
            cupDiff: cupsHit - cupsReceived,
            winRate: matchesPlayed > 0 ? (matchesWon / matchesPlayed) : 0,
            history
        };
    }).sort((a, b) => b.matchesWon - a.matchesWon || b.cupDiff - a.cupDiff);
}

export interface TournamentStanding {
    playerId: string;
    playerName: string;
    played: number;
    won: number;
    lost: number;
    points: number; // 3 for win, 0 for loss? Or just wins? Let's use Wins as points for now.
    cupDiff: number;
}

export async function getTournamentStandings(tournamentId: string): Promise<TournamentStanding[]> {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            rsvps: { include: { player: true } },
            matches: { where: { winnerId: { not: null } } }
        }
    });

    if (!tournament) return [];

    const standings: Record<string, TournamentStanding> = {};

    // Initialize
    tournament.rsvps.forEach(r => {
        if (r.status === 'YES') {
            standings[r.player.id] = {
                playerId: r.player.id,
                playerName: r.player.name,
                played: 0,
                won: 0,
                lost: 0,
                points: 0,
                cupDiff: 0
            };
        }
    });

    // Process matches
    tournament.matches.forEach(m => {
        const p1 = standings[m.player1Id || ''];
        const p2 = standings[m.player2Id || ''];

        if (p1 && p2) {
            p1.played++;
            p2.played++;

            p1.cupDiff += (m.score1 - m.score2);
            p2.cupDiff += (m.score2 - m.score1);

            if (m.winnerId === m.player1Id) {
                p1.won++;
                p1.points += 1; // 1 Point per win
                p2.lost++;
            } else {
                p2.won++;
                p2.points += 1;
                p1.lost++;
            }
        }
    });

    return Object.values(standings).sort((a, b) => b.points - a.points || b.cupDiff - a.cupDiff);
}
