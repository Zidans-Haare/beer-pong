import { prisma } from '@/lib/prisma';
import type { PlayerStats } from '@/lib/stats';

// Minimum games for the per-game awards (Goldener Arm / Goldene Wand)
export const AWARD_MIN_MATCHES = 10;

export type AwardKey = 'bierDor' | 'goldenArm' | 'goldenWall' | 'comeback' | 'goldenRound';

// `detail` feeds the translation string stats.awards.<key>Detail
export interface Award {
    key: AwardKey;
    holder: string | null;
    detail: Record<string, string | number> | null;
}

const empty = (key: AwardKey): Award => ({ key, holder: null, detail: null });

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Season awards ("Preise"): current holder of each title, based on ranked tournaments only.
 * `rankedStats` must be getAllPlayerStats(true, 'all') — already sorted by medal ranking.
 */
export async function getSeasonAwards(rankedStats: PlayerStats[]): Promise<Award[]> {
    const tournaments = await prisma.tournament.findMany({
        where: { status: 'COMPLETED', isRanked: true, isHistorical: false, mode: 'SOLO' },
        orderBy: { date: 'asc' },
        include: {
            participants: { select: { playerId: true } },
            matches: {
                where: { isPlayed: true, winnerId: { not: null }, player1Id: { not: null }, player2Id: { not: null } },
                include: {
                    player1: { select: { id: true, name: true, isGuest: true } },
                    player2: { select: { id: true, name: true, isGuest: true } },
                },
            },
        },
    });

    const awards: Award[] = [];

    // 1. Bier d'Or — #1 of the medal table
    const top = rankedStats.find(s => s.goldMedals + s.silverMedals + s.bronzeMedals > 0);
    awards.push(top
        ? { key: 'bierDor', holder: top.name, detail: { gold: top.goldMedals, silver: top.silverMedals, bronze: top.bronzeMedals } }
        : empty('bierDor'));

    // Per-player cups hit / received
    const cups = new Map<string, { name: string; hit: number; received: number; matches: number }>();
    for (const t of tournaments) {
        for (const m of t.matches) {
            for (const [p, hit, received] of [[m.player1!, m.score1, m.score2], [m.player2!, m.score2, m.score1]] as const) {
                if (p.isGuest) continue;
                const c = cups.get(p.id) ?? { name: p.name, hit: 0, received: 0, matches: 0 };
                c.hit += hit; c.received += received; c.matches++;
                cups.set(p.id, c);
            }
        }
    }
    const eligible = [...cups.values()].filter(c => c.matches >= AWARD_MIN_MATCHES);

    // 2. Goldener Arm — most cups hit per game
    const bestArm = [...eligible].sort((a, b) => b.hit / b.matches - a.hit / a.matches || b.matches - a.matches)[0];
    awards.push(bestArm
        ? { key: 'goldenArm', holder: bestArm.name, detail: { avg: round1(bestArm.hit / bestArm.matches), matches: bestArm.matches } }
        : empty('goldenArm'));

    // 3. Goldene Wand — fewest cups received per game
    const bestWall = [...eligible].sort((a, b) => a.received / a.matches - b.received / b.matches || b.matches - a.matches)[0];
    awards.push(bestWall
        ? { key: 'goldenWall', holder: bestWall.name, detail: { avg: round1(bestWall.received / bestWall.matches), matches: bestWall.matches } }
        : empty('goldenWall'));

    // 4. Mr. Comeback — tournament winner with the worst league placement before the playoffs
    let comeback: { leagueRank: number; award: Award } | null = null;
    const seenPlayers = new Set<string>();
    for (const t of tournaments) {
        const league = t.matches.filter(m => m.stage === 'LEAGUE');
        const bracket = t.matches.filter(m => m.stage === 'BRACKET');
        if (league.length > 0 && bracket.length > 0) {
            const maxRound = Math.max(...bracket.map(m => m.round));
            const semiWinners = new Set(bracket.filter(m => m.round === maxRound - 1).map(m => m.winnerId));
            const final = bracket.find(m => m.round === maxRound && (maxRound === 1 || (semiWinners.has(m.player1Id) && semiWinners.has(m.player2Id))));

            const table = new Map<string, { points: number; diff: number; wins: number }>();
            for (const m of league) {
                for (const [id, own, opp] of [[m.player1Id!, m.score1, m.score2], [m.player2Id!, m.score2, m.score1]] as const) {
                    const row = table.get(id) ?? { points: 0, diff: 0, wins: 0 };
                    row.diff += own - opp;
                    if (m.winnerId === id) { row.points += 3; row.wins++; }
                    table.set(id, row);
                }
            }
            const ranking = [...table.entries()]
                .sort(([, a], [, b]) => b.points - a.points || b.diff - a.diff || b.wins - a.wins)
                .map(([id]) => id);
            const winner = final ? (final.winnerId === final.player1Id ? final.player1 : final.player2) : null;
            const leagueRank = winner ? ranking.indexOf(winner.id) + 1 : 0;

            // >= so that on equal rank the more recent tournament wins
            if (winner && !winner.isGuest && leagueRank > 1 && leagueRank >= (comeback?.leagueRank ?? 0)) {
                comeback = {
                    leagueRank,
                    award: {
                        key: 'comeback', holder: winner.name,
                        detail: { rank: leagueRank, field: ranking.length, tournament: t.name.trim(), debut: seenPlayers.has(winner.id) ? 'no' : 'yes' },
                    },
                };
            }
        }
        for (const p of t.participants) seenPlayers.add(p.playerId);
        for (const m of t.matches) { seenPlayers.add(m.player1Id!); seenPlayers.add(m.player2Id!); }
    }
    awards.push(comeback?.award ?? empty('comeback'));

    // 5. Goldene Runde — biggest winning margin in a single game (ties: playoff game, then most recent)
    let best: { margin: number; bracket: boolean; date: number; award: Award } | null = null;
    for (const t of tournaments) {
        for (const m of t.matches) {
            const p1Won = m.winnerId === m.player1Id;
            const winner = p1Won ? m.player1! : m.player2!;
            const loser = p1Won ? m.player2! : m.player1!;
            if (winner.isGuest) continue;
            const margin = Math.abs(m.score1 - m.score2);
            const bracket = m.stage === 'BRACKET';
            const date = t.date.getTime();
            const better = !best || margin > best.margin
                || (margin === best.margin && (bracket && !best.bracket || (bracket === best.bracket && date >= best.date)));
            if (better) {
                best = {
                    margin, bracket, date,
                    award: {
                        key: 'goldenRound', holder: winner.name,
                        detail: {
                            score: p1Won ? `${m.score1}:${m.score2}` : `${m.score2}:${m.score1}`,
                            opponent: loser.name.trim(), tournament: t.name.trim(), stage: bracket ? 'bracket' : 'league',
                        },
                    },
                };
            }
        }
    }
    awards.push(best?.award ?? empty('goldenRound'));

    return awards;
}
