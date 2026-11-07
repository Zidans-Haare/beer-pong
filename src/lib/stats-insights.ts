import { prisma } from '@/lib/prisma';
import { dateFilter, type SeasonRange } from '@/lib/seasons';

// Ein gespieltes 1v1-Spiel, chronologisch sortierbar
export interface InsightMatch {
    id: string;
    tournamentId: string;
    tournamentName: string;
    date: Date;
    bracket: boolean;
    round: number;
    position: number;
    p1: { id: string; name: string; isGuest: boolean };
    p2: { id: string; name: string; isGuest: boolean };
    score1: number;
    score2: number;
    winnerId: string;
    durationSeconds: number | null;
}

export interface OpponentRecord {
    opponentId: string;
    opponentName: string;
    wins: number;
    losses: number;
    cupsFor: number;
    cupsAgainst: number;
}

export interface PlayerInsight {
    id: string;
    name: string;
    // letzte fünf Spiele, ältestes zuerst
    form: ('W' | 'L')[];
    currentStreak: { type: 'W' | 'L'; count: number } | null;
    longestWinStreak: number;
    opponents: OpponentRecord[];
    nemesisId: string | null;
    favoriteId: string | null;
}

export type StatsRecord =
    | { key: 'winStreak'; player: string; count: number }
    | { key: 'biggestWin'; player: string; score: string; opponent: string; tournament: string; href: string }
    | { key: 'cupsInTournament'; player: string; cups: number; games: number; tournament: string; href: string }
    | { key: 'longestMatch'; player: string; opponent: string; minutes: number; tournament: string; href: string };

export interface StatsInsights {
    players: PlayerInsight[];
    records: StatsRecord[];
}

// Ab so vielen Duellen zählt ein Gegner als Angst- oder Lieblingsgegner
export const MIN_DUELS = 3;

const chronological = (a: InsightMatch, b: InsightMatch) =>
    a.date.getTime() - b.date.getTime()
    || a.tournamentId.localeCompare(b.tournamentId)
    || Number(a.bracket) - Number(b.bracket)
    || a.round - b.round
    || a.position - b.position;

export function computeInsights(input: InsightMatch[]): StatsInsights {
    const matches = [...input].sort(chronological);

    interface Acc {
        id: string; name: string;
        results: ('W' | 'L')[];
        longest: number; run: number;
        opponents: Map<string, OpponentRecord>;
        cupsByTournament: Map<string, { cups: number; games: number; name: string }>;
    }
    const acc = new Map<string, Acc>();
    const get = (p: { id: string; name: string }) => {
        let a = acc.get(p.id);
        if (!a) {
            a = { id: p.id, name: p.name.trim(), results: [], longest: 0, run: 0, opponents: new Map(), cupsByTournament: new Map() };
            acc.set(p.id, a);
        }
        return a;
    };

    let biggest: { margin: number; m: InsightMatch } | null = null;
    let longest: { seconds: number; m: InsightMatch } | null = null;

    for (const m of matches) {
        const sides = [
            { me: m.p1, opp: m.p2, mine: m.score1, theirs: m.score2 },
            { me: m.p2, opp: m.p1, mine: m.score2, theirs: m.score1 },
        ];
        for (const { me, opp, mine, theirs } of sides) {
            if (me.isGuest) continue;
            const a = get(me);
            const won = m.winnerId === me.id;
            a.results.push(won ? 'W' : 'L');
            a.run = won ? a.run + 1 : 0;
            a.longest = Math.max(a.longest, a.run);

            const t = a.cupsByTournament.get(m.tournamentId) ?? { cups: 0, games: 0, name: m.tournamentName.trim() };
            t.cups += mine; t.games++;
            a.cupsByTournament.set(m.tournamentId, t);

            // Gäste tauchen nicht im direkten Vergleich auf
            if (opp.isGuest) continue;
            const o = a.opponents.get(opp.id) ?? { opponentId: opp.id, opponentName: opp.name.trim(), wins: 0, losses: 0, cupsFor: 0, cupsAgainst: 0 };
            if (won) o.wins++; else o.losses++;
            o.cupsFor += mine; o.cupsAgainst += theirs;
            a.opponents.set(opp.id, o);
        }

        const winnerIsP1 = m.winnerId === m.p1.id;
        const winner = winnerIsP1 ? m.p1 : m.p2;
        if (!winner.isGuest) {
            const margin = Math.abs(m.score1 - m.score2);
            // bei Gleichstand gewinnt das neuere Spiel
            if (!biggest || margin >= biggest.margin) biggest = { margin, m };
        }
        // Dauer nur werten, wenn sie plausibel ist (1–60 Minuten)
        const seconds = m.durationSeconds ?? 0;
        if (seconds >= 60 && seconds <= 3600 && !m.p1.isGuest && !m.p2.isGuest && (!longest || seconds >= longest.seconds)) {
            longest = { seconds, m };
        }
    }

    const players: PlayerInsight[] = [...acc.values()].map(a => {
        const opponents = [...a.opponents.values()].sort((x, y) => (y.wins + y.losses) - (x.wins + x.losses) || x.opponentName.localeCompare(y.opponentName));
        const rated = opponents.filter(o => o.wins + o.losses >= MIN_DUELS);
        const share = (o: OpponentRecord) => o.wins / (o.wins + o.losses);
        const diff = (o: OpponentRecord) => o.cupsFor - o.cupsAgainst;
        const worst = [...rated].filter(o => o.losses > o.wins).sort((x, y) => share(x) - share(y) || diff(x) - diff(y))[0];
        const best = [...rated].filter(o => o.wins > o.losses).sort((x, y) => share(y) - share(x) || diff(y) - diff(x))[0];

        const last = a.results[a.results.length - 1];
        let count = 0;
        for (let i = a.results.length - 1; i >= 0 && a.results[i] === last; i--) count++;

        return {
            id: a.id,
            name: a.name,
            form: a.results.slice(-5),
            currentStreak: last ? { type: last, count } : null,
            longestWinStreak: a.longest,
            opponents,
            nemesisId: worst?.opponentId ?? null,
            favoriteId: best?.opponentId ?? null,
        };
    });

    const records: StatsRecord[] = [];
    const href = (m: InsightMatch) => `/tournaments/${m.tournamentId}`;

    const streakHolder = [...acc.values()].sort((x, y) => y.longest - x.longest || x.name.localeCompare(y.name))[0];
    if (streakHolder && streakHolder.longest >= 2) {
        records.push({ key: 'winStreak', player: streakHolder.name, count: streakHolder.longest });
    }

    if (biggest && biggest.margin > 0) {
        const m = biggest.m;
        const p1Won = m.winnerId === m.p1.id;
        records.push({
            key: 'biggestWin',
            player: (p1Won ? m.p1 : m.p2).name.trim(),
            opponent: (p1Won ? m.p2 : m.p1).name.trim(),
            score: p1Won ? `${m.score1}:${m.score2}` : `${m.score2}:${m.score1}`,
            tournament: m.tournamentName.trim(),
            href: href(m),
        });
    }

    let cups: { player: string; cups: number; games: number; tournament: string; tournamentId: string } | null = null;
    for (const a of acc.values()) {
        for (const [tournamentId, t] of a.cupsByTournament) {
            if (!cups || t.cups > cups.cups) cups = { player: a.name, cups: t.cups, games: t.games, tournament: t.name, tournamentId };
        }
    }
    if (cups && cups.cups > 0) {
        records.push({ key: 'cupsInTournament', player: cups.player, cups: cups.cups, games: cups.games, tournament: cups.tournament, href: `/tournaments/${cups.tournamentId}` });
    }

    if (longest) {
        const m = longest.m;
        const p1Won = m.winnerId === m.p1.id;
        records.push({
            key: 'longestMatch',
            player: (p1Won ? m.p1 : m.p2).name.trim(),
            opponent: (p1Won ? m.p2 : m.p1).name.trim(),
            minutes: Math.round(longest.seconds / 60),
            tournament: m.tournamentName.trim(),
            href: href(m),
        });
    }

    return { players, records };
}

// Lädt die 1v1-Spiele der abgeschlossenen Turniere im gewählten Zeitraum
export async function getInsightMatches(onlyRanked: boolean, season?: SeasonRange): Promise<InsightMatch[]> {
    const dates = dateFilter(season);
    const rows = await prisma.match.findMany({
        where: {
            isPlayed: true,
            winnerId: { not: null },
            player1Id: { not: null },
            player2Id: { not: null },
            tournament: {
                status: 'COMPLETED',
                isHistorical: false,
                ...(onlyRanked ? { isRanked: true } : {}),
                ...(dates ? { date: dates } : {}),
            },
        },
        include: {
            tournament: { select: { id: true, name: true, date: true } },
            player1: { select: { id: true, name: true, isGuest: true } },
            player2: { select: { id: true, name: true, isGuest: true } },
        },
    });

    return rows.map(m => ({
        id: m.id,
        tournamentId: m.tournamentId,
        tournamentName: m.tournament.name,
        date: m.tournament.date,
        bracket: m.stage === 'BRACKET',
        round: m.round,
        position: m.position,
        p1: m.player1!,
        p2: m.player2!,
        score1: m.score1,
        score2: m.score2,
        winnerId: m.winnerId!,
        durationSeconds: m.durationSeconds
            ?? (m.completedAt && m.startedAt ? Math.floor((m.completedAt.getTime() - m.startedAt.getTime()) / 1000) : null),
    }));
}

export async function getStatsInsights(onlyRanked: boolean, season?: SeasonRange): Promise<StatsInsights> {
    return computeInsights(await getInsightMatches(onlyRanked, season));
}
