import { computeInsights, type InsightMatch } from '@/lib/stats-insights';
import type { FigureLook, SceneModel, SceneSegment } from '@/lib/wrapped-scene';

// Bier Pong Wrapped: Rückblick eines Spielers über einen Zeitraum.
// Reine Berechnung aus den Spielen, damit sie testbar bleibt.

export type PersonaKey = 'sniper' | 'wall' | 'closer' | 'streak' | 'marathon' | 'rookie' | 'allrounder';

export interface WrappedData {
    playerId: string;
    playerName: string;
    games: number;
    wins: number;
    losses: number;
    winRate: number; // 0..1
    tournaments: number;
    cupsHit: number;
    cupsReceived: number;
    cupsPerGame: number;
    // Anteil der Spieler mit weniger getroffenen Bechern (0..100)
    cupsPercentile: number;
    minutes: number;
    longestWinStreak: number;
    rival: { name: string; games: number; wins: number; losses: number } | null;
    favorite: { name: string; wins: number; losses: number } | null;
    nemesis: { name: string; wins: number; losses: number } | null;
    biggestWin: { score: string; opponent: string; tournament: string } | null;
    bestTournament: { name: string; wins: number; games: number } | null;
    medals: { gold: number; silver: number; bronze: number };
    rank: number | null;
    totalPlayers: number;
    persona: PersonaKey;
}

interface Totals {
    id: string; name: string;
    games: number; wins: number; cupsHit: number; cupsReceived: number; seconds: number;
    tournaments: Map<string, { name: string; wins: number; games: number; date: number }>;
    biggest: { margin: number; score: string; opponent: string; tournament: string } | null;
}

export interface WrappedExtras {
    medals: Map<string, { gold: number; silver: number; bronze: number }>;
    // Spieler-IDs in Reihenfolge der Rangliste
    ranking: string[];
}

// Wert, den `share` der Spieler unterschreiten (einfaches Quantil)
function quantile(values: number[], share: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))];
}

export function computeWrapped(matches: InsightMatch[], extras: WrappedExtras): Map<string, WrappedData> {
    const totals = new Map<string, Totals>();
    const get = (p: { id: string; name: string }) => {
        let t = totals.get(p.id);
        if (!t) { t = { id: p.id, name: p.name.trim(), games: 0, wins: 0, cupsHit: 0, cupsReceived: 0, seconds: 0, tournaments: new Map(), biggest: null }; totals.set(p.id, t); }
        return t;
    };

    for (const m of matches) {
        const sides = [
            { me: m.p1, opp: m.p2, mine: m.score1, theirs: m.score2 },
            { me: m.p2, opp: m.p1, mine: m.score2, theirs: m.score1 },
        ];
        const seconds = m.durationSeconds !== null && m.durationSeconds >= 60 && m.durationSeconds <= 3600 ? m.durationSeconds : 0;
        for (const { me, opp, mine, theirs } of sides) {
            if (me.isGuest) continue;
            const t = get(me);
            const won = m.winnerId === me.id;
            t.games++; t.cupsHit += mine; t.cupsReceived += theirs; t.seconds += seconds;
            if (won) t.wins++;
            const tour = t.tournaments.get(m.tournamentId) ?? { name: m.tournamentName.trim(), wins: 0, games: 0, date: m.date.getTime() };
            tour.games++; if (won) tour.wins++;
            t.tournaments.set(m.tournamentId, tour);
            const margin = mine - theirs;
            if (won && (!t.biggest || margin >= t.biggest.margin)) {
                t.biggest = { margin, score: `${mine}:${theirs}`, opponent: opp.name.trim(), tournament: m.tournamentName.trim() };
            }
        }
    }

    const insights = new Map(computeInsights(matches).players.map(p => [p.id, p]));
    const all = [...totals.values()];
    const perGameHit = (t: Totals) => t.cupsHit / t.games;
    const perGameReceived = (t: Totals) => t.cupsReceived / t.games;
    // Vergleichswerte nur über Spieler mit genug Spielen, sonst verzerren Einzelspiele
    const regulars = all.filter(t => t.games >= 5);
    const topHit = quantile(regulars.map(perGameHit), 0.75);
    const lowReceived = quantile(regulars.map(perGameReceived), 0.25);
    const manyGames = quantile(all.map(t => t.games), 0.75);

    const result = new Map<string, WrappedData>();
    for (const t of all) {
        const insight = insights.get(t.id);
        const winRate = t.wins / t.games;
        const streak = insight?.longestWinStreak ?? 0;
        const opponents = insight?.opponents ?? [];
        const byId = (id: string | null | undefined) => opponents.find(o => o.opponentId === id);
        const rival = opponents[0];
        const favorite = byId(insight?.favoriteId);
        const nemesis = byId(insight?.nemesisId);
        const best = [...t.tournaments.values()].sort((a, b) => b.wins - a.wins || (b.wins / b.games) - (a.wins / a.games) || b.date - a.date)[0];

        let persona: PersonaKey = 'allrounder';
        if (t.games < 5) persona = 'rookie';
        else if (regulars.length >= 4 && perGameHit(t) >= topHit) persona = 'sniper';
        else if (regulars.length >= 4 && perGameReceived(t) <= lowReceived) persona = 'wall';
        else if (winRate >= 0.65) persona = 'closer';
        else if (streak >= 6) persona = 'streak';
        else if (all.length >= 4 && t.games >= manyGames) persona = 'marathon';

        const fewer = all.filter(o => o.cupsHit < t.cupsHit).length;
        const rank = extras.ranking.indexOf(t.id);

        result.set(t.id, {
            playerId: t.id,
            playerName: t.name,
            games: t.games,
            wins: t.wins,
            losses: t.games - t.wins,
            winRate,
            tournaments: t.tournaments.size,
            cupsHit: t.cupsHit,
            cupsReceived: t.cupsReceived,
            cupsPerGame: perGameHit(t),
            cupsPercentile: all.length > 1 ? Math.round((fewer / (all.length - 1)) * 100) : 100,
            minutes: Math.round(t.seconds / 60),
            longestWinStreak: streak,
            rival: rival ? { name: rival.opponentName, games: rival.wins + rival.losses, wins: rival.wins, losses: rival.losses } : null,
            favorite: favorite ? { name: favorite.opponentName, wins: favorite.wins, losses: favorite.losses } : null,
            nemesis: nemesis ? { name: nemesis.opponentName, wins: nemesis.wins, losses: nemesis.losses } : null,
            biggestWin: t.biggest ? { score: t.biggest.score, opponent: t.biggest.opponent, tournament: t.biggest.tournament } : null,
            bestTournament: best ? { name: best.name, wins: best.wins, games: best.games } : null,
            medals: extras.medals.get(t.id) ?? { gold: 0, silver: 0, bronze: 0 },
            rank: rank >= 0 ? rank + 1 : null,
            totalPlayers: extras.ranking.length,
            persona,
        });
    }
    return result;
}

// ---- Abschnitte der Szene ----

type Translate = (key: string, values?: Record<string, string | number>) => string;

// Texte für die Abschnitte: Tisch, Aufbau/Gegner, Wurf, Schlagabtausch, Sieg, Abschluss, Abspann
export function buildScene(data: WrappedData, wrappedTitle: string, primary: string, t: Translate, locale = 'de-DE', looks?: { me: FigureLook; opponent: FigureLook | null }): SceneModel {
    const percent = Math.round(data.winRate * 100);
    const medalTotal = data.medals.gold + data.medals.silver + data.medals.bronze;
    const medalsLine = t('medalsLine', { gold: data.medals.gold, silver: data.medals.silver, bronze: data.medals.bronze });

    const segments: SceneSegment[] = [
        {
            key: 'table', eyebrow: t('gamesEyebrow'),
            value: String(data.games), countTo: data.games, title: t('gamesTitle', { count: data.games }),
            lines: [t('gamesTournaments', { count: data.tournaments }), ...(data.minutes > 0 ? [t('gamesMinutes', { minutes: data.minutes })] : [])],
        },
        data.rival ? {
            key: 'setup', eyebrow: t('rivalEyebrow'),
            value: data.rival.name, title: t('rivalTitle', { count: data.rival.games }),
            lines: [
                t('rivalRecord', { wins: data.rival.wins, losses: data.rival.losses }),
                ...(data.nemesis ? [t('nemesisLine', { name: data.nemesis.name, wins: data.nemesis.wins, losses: data.nemesis.losses })]
                    : data.favorite ? [t('favoriteLine', { name: data.favorite.name, wins: data.favorite.wins, losses: data.favorite.losses })] : []),
            ],
        } : {
            // ohne festen Gegner: Turniere statt Duelle
            key: 'setup', eyebrow: t('tournamentsEyebrow'),
            value: String(data.tournaments), countTo: data.tournaments, title: t('tournamentsTitle', { count: data.tournaments }),
            lines: data.bestTournament && data.bestTournament.wins > 0 ? [t('bestTournament', { name: data.bestTournament.name, wins: data.bestTournament.wins, games: data.bestTournament.games })] : [],
        },
        {
            key: 'throw', eyebrow: t('cupsEyebrow'),
            value: String(data.cupsHit), countTo: data.cupsHit, title: t('cupsTitle'),
            // der Vergleich erscheint nur, wenn er ein Lob ist
            lines: [
                t('cupsPerGame', { avg: data.cupsPerGame.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }),
                ...(data.totalPlayers > 1 && data.cupsPercentile >= 50 ? [t('cupsPercentile', { percent: data.cupsPercentile })] : []),
            ],
        },
        {
            key: 'rally', eyebrow: t('recordEyebrow'),
            value: `${percent}%`, countTo: percent, suffix: '%', title: t('recordTitle', { wins: data.wins, losses: data.losses }),
            lines: [
                ...(data.longestWinStreak >= 2 ? [t('recordStreak', { count: data.longestWinStreak })] : []),
                ...(data.biggestWin ? [t('bestLine', { score: data.biggestWin.score, opponent: data.biggestWin.opponent })] : []),
            ],
        },
        {
            key: 'win', eyebrow: wrappedTitle,
            value: String(data.wins), countTo: data.wins, title: t('winsTitle', { count: data.wins }),
            lines: [
                ...(data.rank ? [t('recordRank', { rank: data.rank, total: data.totalPlayers })] : []),
                ...(medalTotal > 0 ? [medalsLine] : []),
            ],
        },
        {
            key: 'final', eyebrow: t('personaEyebrow'),
            value: t(`persona.${data.persona}.name`), title: t(`persona.${data.persona}.text`),
            lines: [
                t('summaryGames', { games: data.games, tournaments: data.tournaments }),
                t('summaryRecord', { wins: data.wins, losses: data.losses, percent }),
                t('summaryCups', { cups: data.cupsHit }),
                ...(data.longestWinStreak >= 2 ? [t('summaryStreak', { count: data.longestWinStreak })] : []),
                ...(medalTotal > 0 ? [medalsLine] : []),
            ],
        },
        // Abspann mit Logo; Texte auch für Screenreader
        { key: 'outro', eyebrow: t('brand'), value: t('outroTitle'), title: t('outroLine'), lines: [] },
    ];

    return {
        title: wrappedTitle, playerName: data.playerName, opponentName: data.rival?.name ?? null, primary,
        winLabel: t('winStamp'), outro: { title: t('outroTitle'), line: t('outroLine') }, segments, looks,
    };
}
