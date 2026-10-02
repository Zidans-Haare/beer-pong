import { prisma } from '@/lib/prisma';
import { computePlacements, type PlayerStats } from '@/lib/stats';

// Minimum games for the per-game awards (Goldener Arm / Goldene Wand)
export const AWARD_MIN_MATCHES = 10;

export type AwardKey = 'bierDor' | 'goldenArm' | 'goldenWall' | 'comeback' | 'goldenRound';

// A cell is a plain value, a translation key (stats.awardCells.<t>), a link or a medal
export type AwardCell = string | number | { t: string } | { text: string; href: string } | { medal: 'gold' | 'silver' | 'bronze' };

// Tournament page link that scrolls to and flashes the given matches
const matchLink = (tournamentId: string, matchIds: string[]) =>
    `/tournaments/${tournamentId}${matchIds.length ? `?match=${matchIds.join(',')}` : ''}`;

export interface AwardRankingRow {
    player: string;
    cells: AwardCell[];
    // Shown greyed out without a rank (e.g. too few games)
    ineligible?: boolean;
}

export interface Award {
    key: AwardKey;
    holder: string | null;
    // Feeds the translation string stats.awards.<key>Detail
    detail: Record<string, string | number> | null;
    // Full ranking behind the award; column headers are stats.awardCols.<column>
    columns: string[];
    rows: AwardRankingRow[];
}

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
    const medalists = rankedStats.filter(s => s.goldMedals + s.silverMedals + s.bronzeMedals > 0);
    const top = medalists[0];
    awards.push({
        key: 'bierDor',
        holder: top?.name ?? null,
        detail: top ? { gold: top.goldMedals, silver: top.silverMedals, bronze: top.bronzeMedals } : null,
        columns: ['player', 'gold', 'silver', 'bronze', 'total'],
        rows: medalists.map(s => ({
            player: s.name,
            cells: [s.goldMedals, s.silverMedals, s.bronzeMedals, s.goldMedals + s.silverMedals + s.bronzeMedals],
        })),
    });

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
    const perGameAward = (key: 'goldenArm' | 'goldenWall', value: (c: { hit: number; received: number }) => number, higherIsBetter: boolean): Award => {
        const sorted = [...cups.values()].sort((a, b) => {
            const eligibleDiff = Number(b.matches >= AWARD_MIN_MATCHES) - Number(a.matches >= AWARD_MIN_MATCHES);
            const diff = value(a) / a.matches - value(b) / b.matches;
            return eligibleDiff || (higherIsBetter ? -diff : diff) || b.matches - a.matches;
        });
        const best = sorted[0]?.matches >= AWARD_MIN_MATCHES ? sorted[0] : null;
        return {
            key,
            holder: best?.name ?? null,
            detail: best ? { avg: round1(value(best) / best.matches), matches: best.matches } : null,
            columns: ['player', key === 'goldenArm' ? 'avgHit' : 'avgReceived', key === 'goldenArm' ? 'cupsHit' : 'cupsReceived', 'games'],
            rows: sorted.map(c => ({
                player: c.name,
                cells: [round1(value(c) / c.matches), value(c), c.matches],
                ineligible: c.matches < AWARD_MIN_MATCHES,
            })),
        };
    };

    // 2. Goldener Arm — most cups hit per game
    awards.push(perGameAward('goldenArm', c => c.hit, true));
    // 3. Goldene Wand — fewest cups received per game
    awards.push(perGameAward('goldenWall', c => c.received, false));

    // 4. Mr. Comeback — longest losing streak at the start of a tournament that still ended on the podium
    const { podiumByTournament } = await computePlacements(true);
    const medalOrder = { gold: 3, silver: 2, bronze: 1 } as const;
    const comebacks: { name: string; losses: number; medal: keyof typeof medalOrder; tournament: string; href: string; date: number }[] = [];
    for (const t of tournaments) {
        const podium = podiumByTournament.get(t.id);
        if (!podium) continue;
        // League games first, then playoffs, each by round
        const ordered = [...t.matches].sort((x, y) =>
            (x.stage === 'BRACKET' ? 1 : 0) - (y.stage === 'BRACKET' ? 1 : 0) || x.round - y.round || x.position - y.position);
        for (const [playerId, medal] of podium) {
            const games = ordered.filter(m => m.player1Id === playerId || m.player2Id === playerId);
            const player = games[0] && (games[0].player1Id === playerId ? games[0].player1! : games[0].player2!);
            if (!player || player.isGuest) continue;
            const firstWin = games.findIndex(m => m.winnerId === playerId);
            const losses = firstWin === -1 ? games.length : firstWin;
            comebacks.push({
                name: player.name, losses, medal, tournament: t.name.trim(),
                href: matchLink(t.id, games.slice(0, losses).map(m => m.id)),
                date: t.date.getTime(),
            });
        }
    }
    comebacks.sort((a, b) => b.losses - a.losses || medalOrder[b.medal] - medalOrder[a.medal] || b.date - a.date);
    const comeback = comebacks[0]?.losses > 0 ? comebacks[0] : null;
    awards.push({
        key: 'comeback',
        holder: comeback?.name ?? null,
        detail: comeback ? { losses: comeback.losses, medal: comeback.medal, tournament: comeback.tournament } : null,
        columns: ['player', 'openingLosses', 'medal', 'tournament'],
        rows: comebacks.map(c => ({
            player: c.name,
            cells: [c.losses, { medal: c.medal }, { text: c.tournament, href: c.href }],
            ineligible: c.losses === 0,
        })),
    });

    // 5. Goldene Runde — biggest winning margin in a single game (ties: playoff game, then most recent).
    // Ranking shows each player's best win.
    const bestWins = new Map<string, { name: string; margin: number; bracket: boolean; date: number; score: string; opponent: string; tournament: string; href: string }>();
    for (const t of tournaments) {
        for (const m of t.matches) {
            const p1Won = m.winnerId === m.player1Id;
            const winner = p1Won ? m.player1! : m.player2!;
            const loser = p1Won ? m.player2! : m.player1!;
            if (winner.isGuest) continue;
            const win = {
                name: winner.name,
                margin: Math.abs(m.score1 - m.score2),
                bracket: m.stage === 'BRACKET',
                date: t.date.getTime(),
                score: p1Won ? `${m.score1}:${m.score2}` : `${m.score2}:${m.score1}`,
                opponent: loser.name.trim(),
                tournament: t.name.trim(),
                href: matchLink(t.id, [m.id]),
            };
            const prev = bestWins.get(winner.id);
            if (!prev || compareWins(win, prev) < 0) bestWins.set(winner.id, win);
        }
    }
    const wins = [...bestWins.values()].sort(compareWins);
    const best = wins[0];
    awards.push({
        key: 'goldenRound',
        holder: best?.name ?? null,
        detail: best ? { score: best.score, opponent: best.opponent, tournament: best.tournament, stage: best.bracket ? 'bracket' : 'league' } : null,
        columns: ['player', 'score', 'opponent', 'tournament', 'stage'],
        rows: wins.map(w => ({
            player: w.name,
            cells: [w.score, w.opponent, { text: w.tournament, href: w.href }, { t: w.bracket ? 'bracket' : 'league' }],
        })),
    });

    return awards;
}

// Negative when `a` is the better win: bigger margin, then playoff game, then more recent
function compareWins(a: { margin: number; bracket: boolean; date: number }, b: { margin: number; bracket: boolean; date: number }) {
    return b.margin - a.margin || Number(b.bracket) - Number(a.bracket) || b.date - a.date;
}
