import { lookFor, type FigureMap } from '@/lib/figure';
import type { FilmKey, FilmModel, FilmSide, FilmStep } from '@/lib/tournament-scene';

// Turnierfilm: baut aus den Spielen eines Turniers das Modell für die Szene.
// Reine Berechnung, damit sie testbar bleibt; die Daten lädt tournament-film-server.ts.

export type Medal = 'gold' | 'silver' | 'bronze';

// Eine Seite eines Spiels: ein Spieler oder ein Team
export interface FilmParty { ids: string[]; names: string[]; label: string }

export interface FilmMatch {
    stage: string;
    round: number;
    completedAt: number | null;
    durationSeconds: number | null;
    score1: number;
    score2: number;
    side1: FilmParty;
    side2: FilmParty;
    winner: 1 | 2 | null;
}

export interface FilmInput {
    name: string;
    date: Date;
    playerCount: number;
    matches: FilmMatch[];
    // Spieler-ID -> Medaille, wie in der Statistik berechnet
    podium: Map<string, Medal>;
    playerNames: Map<string, string>;
    // Figuren der Spieler nach Namen; ohne Eintrag gilt das Aussehen aus dem Namen
    figures?: FigureMap;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

// Das Aussehen kommt aus den Figuren der Spieler (siehe figure.ts); wer nichts eingestellt hat, bekommt eines aus dem Namen
export { lookFor };

const side = (party: FilmParty, figures?: FigureMap): FilmSide => ({ label: party.label, names: party.names, looks: party.names.slice(0, 2).map(n => lookFor(n, 0, figures)) });

// Endspiel: das letzte Spiel, in dem Gold gegen Silber gewonnen hat (K.-o.-Runde vor Liga)
export function findFinal(matches: FilmMatch[], podium: Map<string, Medal>): FilmMatch | null {
    const has = (party: FilmParty, medal: Medal) => party.ids.some(id => podium.get(id) === medal);
    const candidates = matches.filter(m => {
        if (!m.winner) return false;
        const [winner, loser] = m.winner === 1 ? [m.side1, m.side2] : [m.side2, m.side1];
        return has(winner, 'gold') && has(loser, 'silver');
    });
    candidates.sort((a, b) => (Number(b.stage === 'BRACKET') - Number(a.stage === 'BRACKET')) || b.round - a.round || (b.completedAt ?? 0) - (a.completedAt ?? 0));
    return candidates[0] ?? null;
}

// Podium: Spieler je Medaille, Teams bleiben zusammen
export function buildPodium(input: Pick<FilmInput, 'matches' | 'podium' | 'playerNames' | 'figures'>): FilmStep[] {
    const { podium } = input;
    const parties = input.matches.filter(m => m.winner).flatMap(m => [m.side1, m.side2]);
    const steps: FilmStep[] = [];
    (['gold', 'silver', 'bronze'] as const).forEach((medal, index) => {
        const ids = [...podium.entries()].filter(([, m]) => m === medal).map(([id]) => id);
        if (ids.length === 0) return;
        const labels: string[] = [];
        const names: string[] = [];
        const seen = new Set<string>();
        for (const id of ids) {
            if (seen.has(id)) continue;
            const party = parties.find(p => p.ids.includes(id));
            if (party) {
                labels.push(party.label);
                party.ids.forEach(pid => seen.add(pid));
                names.push(...party.names);
            } else {
                const name = input.playerNames.get(id);
                if (!name) continue;
                seen.add(id); labels.push(name); names.push(name);
            }
        }
        if (names.length === 0) return;
        steps.push({ place: (index + 1) as 1 | 2 | 3, label: labels.join(' & '), names, looks: names.slice(0, 2).map(n => lookFor(n, 0, input.figures)) });
    });
    return steps;
}

export function buildTournamentFilm(input: FilmInput, primary: string, t: Translate, locale = 'de-DE'): FilmModel {
    const { matches, podium } = input;
    const played = matches.filter(m => m.winner);
    const parties = played.flatMap(m => [m.side1, m.side2]);

    const steps = buildPodium(input);

    // ---- Endspiel ----
    const finalMatch = findFinal(played, podium);
    let final: FilmModel['final'] = null;
    if (finalMatch) {
        const first = finalMatch.winner === 1;
        const winner = side(first ? finalMatch.side1 : finalMatch.side2, input.figures);
        const loser = side(first ? finalMatch.side2 : finalMatch.side1, input.figures);
        // gleiche Trikotfarbe am Tisch vermeiden
        if (winner.looks[0] && loser.looks[0]?.shirt === winner.looks[0].shirt) loser.looks = loser.names.slice(0, 2).map(n => lookFor(n, 3, input.figures));
        final = {
            winner, loser,
            winnerScore: first ? finalMatch.score1 : finalMatch.score2,
            loserScore: first ? finalMatch.score2 : finalMatch.score1,
            stamp: t('stamp', { name: winner.label }).toUpperCase(),
            line: t('finalLine', { winner: winner.label, loser: loser.label }),
        };
    }

    // ---- Zahlen zum Turnier ----
    const cups = new Map<string, number>();
    let totalCups = 0;
    let biggest: { margin: number; winner: string; loser: string; score: string } | null = null;
    let longest: { seconds: number; a: string; b: string } | null = null;
    for (const m of played) {
        cups.set(m.side1.label, (cups.get(m.side1.label) ?? 0) + m.score1);
        cups.set(m.side2.label, (cups.get(m.side2.label) ?? 0) + m.score2);
        totalCups += m.score1 + m.score2;
        const [w, l, ws, ls] = m.winner === 1 ? [m.side1, m.side2, m.score1, m.score2] : [m.side2, m.side1, m.score2, m.score1];
        if (ws - ls > 0 && (!biggest || ws - ls > biggest.margin)) biggest = { margin: ws - ls, winner: w.label, loser: l.label, score: `${ws}:${ls}` };
        const seconds = m.durationSeconds;
        if (seconds !== null && seconds >= 60 && seconds <= 3600 && (!longest || seconds > longest.seconds)) longest = { seconds, a: m.side1.label, b: m.side2.label };
    }
    const top = [...cups.entries()].sort((a, b) => b[1] - a[1])[0];
    const second = steps.find(s => s.place === 2), third = steps.find(s => s.place === 3);
    const lines = [
        ...(second ? [third ? t('factsPodium', { second: second.label, third: third.label }) : t('factsSecond', { second: second.label })] : []),
        totalCups > 0 ? t('factsGames', { games: played.length, cups: totalCups }) : t('factsGamesOnly', { games: played.length }),
        ...(top && top[1] > 0 ? [t('factsTopScorer', { name: top[0], cups: top[1] })] : []),
        ...(biggest ? [t('factsBiggest', { winner: biggest.winner, score: biggest.score, loser: biggest.loser })] : []),
        ...(longest ? [t('factsLongest', { minutes: Math.round(longest.seconds / 60), a: longest.a, b: longest.b })] : []),
    ];

    const date = input.date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    const champion = steps.find(s => s.place === 1)?.label ?? final?.winner.label ?? input.name;
    const subtitle = [date, t('players', { count: input.playerCount }), t('games', { count: played.length })].join(' · ');
    const facts = { eyebrow: `${t('factsEyebrow')} · ${date}`, value: champion, title: input.name.trim(), lines };

    const descriptions: Partial<Record<FilmKey, string>> = {
        intro: [final ? t('finalEyebrow') : t('brand'), input.name, subtitle].join('. '),
        final: final ? `${final.winner.label} ${final.winnerScore} : ${final.loserScore} ${final.loser.label}` : '',
        win: final ? final.line : '',
        podium: [t('podiumTitle'), ...steps.map(s => `${s.place}. ${s.label}`)].join('. '),
        facts: [facts.eyebrow, facts.value, facts.title, ...lines].join('. '),
    };

    return {
        title: input.name.trim(), primary,
        eyebrow: final ? t('finalEyebrow') : t('filmEyebrow'),
        subtitle, brand: t('brand'), final,
        podiumTitle: t('podiumTitle'), podium: steps, facts,
        descriptions,
    };
}
