// Bilanz eines Spielers im Minispiel, aufgeschlüsselt: Computer nach Stufe, Duelle, direkter Vergleich, letzte Duelle.
// Reine Berechnung aus den Spielen, damit sie testbar bleibt; die Daten lädt stats-server.ts.

export interface ProfileGame {
    id: string;
    mode: 'CPU' | 'DUEL';
    status: 'COMPLETED' | 'PENDING' | 'DECLINED';
    difficulty: string | null;
    cupSize: string | null;
    challengerId: string;
    opponentId: string | null;
    challengerName: string;
    opponentName: string | null;
    challengerRounds: number | null;
    opponentRounds: number | null;
    challengerHits: number | null;
    opponentHits: number | null;
    winner: 'CHALLENGER' | 'OPPONENT' | null;
    nakedMile: 'CHALLENGER' | 'OPPONENT' | null;
    createdAt: Date;
    completedAt: Date | null;
}

export interface DuelEntry {
    id: string;
    opponentId: string;
    opponentName: string;
    won: boolean;
    // ich war es, der vorgelegt hat
    challenger: boolean;
    myRounds: number | null;
    theirRounds: number | null;
    myHits: number | null;
    theirHits: number | null;
    cupSize: string;
    nakedMile: 'me' | 'them' | null;
    date: Date;
}

export interface LevelRecord { games: number; wins: number }

export interface MiniGameProfile {
    games: number;
    wins: number;
    losses: number;
    // schnellster Sieg und Schnitt der Runden in gewonnenen Spielen
    bestRounds: number | null;
    averageRounds: number | null;
    hits: number;
    cpu: { games: number; wins: number; byLevel: Record<'easy' | 'normal' | 'hard', LevelRecord> };
    duels: {
        games: number; wins: number; losses: number;
        // von mir vorgelegt und nachgezogen
        asChallenger: LevelRecord; asOpponent: LevelRecord;
        // noch offen: auf mich wartend, auf andere wartend, abgelehnt
        waitingForMe: number; waitingForThem: number; declined: number;
    };
    nakedMiles: { ran: number; made: number };
    headToHead: { id: string; name: string; wins: number; losses: number }[];
    recentDuels: DuelEntry[];
}

const SIZES = new Set(['small', 'medium', 'large']);

export function buildMiniGameProfile(playerId: string, games: ProfileGame[], recentLimit = 8): MiniGameProfile {
    const profile: MiniGameProfile = {
        games: 0, wins: 0, losses: 0, bestRounds: null, averageRounds: null, hits: 0,
        cpu: { games: 0, wins: 0, byLevel: { easy: { games: 0, wins: 0 }, normal: { games: 0, wins: 0 }, hard: { games: 0, wins: 0 } } },
        duels: { games: 0, wins: 0, losses: 0, asChallenger: { games: 0, wins: 0 }, asOpponent: { games: 0, wins: 0 }, waitingForMe: 0, waitingForThem: 0, declined: 0 },
        nakedMiles: { ran: 0, made: 0 },
        headToHead: [], recentDuels: [],
    };
    const roundsOfWins: number[] = [];
    const rivals = new Map<string, { id: string; name: string; wins: number; losses: number }>();
    const recent: DuelEntry[] = [];

    for (const g of games) {
        const iAmChallenger = g.challengerId === playerId;
        const iAmOpponent = g.opponentId === playerId;
        if (!iAmChallenger && !iAmOpponent) continue;

        if (g.status === 'PENDING') { if (iAmOpponent) profile.duels.waitingForMe++; else profile.duels.waitingForThem++; continue; }
        if (g.status === 'DECLINED') { profile.duels.declined++; continue; }

        const mine = iAmChallenger ? { rounds: g.challengerRounds, hits: g.challengerHits } : { rounds: g.opponentRounds, hits: g.opponentHits };
        const theirs = iAmChallenger ? { rounds: g.opponentRounds, hits: g.opponentHits } : { rounds: g.challengerRounds, hits: g.challengerHits };
        const won = g.winner === (iAmChallenger ? 'CHALLENGER' : 'OPPONENT');
        // der Rechner hat keine Bilanz: Spiele gegen ihn zählen nur für den, der sie gespielt hat
        if (g.mode === 'CPU' && !iAmChallenger) continue;

        profile.games++;
        profile.hits += mine.hits ?? 0;
        if (won) {
            profile.wins++;
            if (mine.rounds && mine.rounds > 0) roundsOfWins.push(mine.rounds);
        } else profile.losses++;
        const loserNaked = g.nakedMile === (iAmChallenger ? 'CHALLENGER' : 'OPPONENT');
        if (loserNaked) profile.nakedMiles.ran++;
        if (g.nakedMile && !loserNaked) profile.nakedMiles.made++;

        if (g.mode === 'CPU') {
            profile.cpu.games++;
            if (won) profile.cpu.wins++;
            const level = g.difficulty === 'easy' || g.difficulty === 'hard' ? g.difficulty : 'normal';
            profile.cpu.byLevel[level].games++;
            if (won) profile.cpu.byLevel[level].wins++;
            continue;
        }

        // Duell
        profile.duels.games++;
        if (won) profile.duels.wins++; else profile.duels.losses++;
        const role = iAmChallenger ? profile.duels.asChallenger : profile.duels.asOpponent;
        role.games++;
        if (won) role.wins++;
        const rivalId = (iAmChallenger ? g.opponentId : g.challengerId) ?? '';
        const rivalName = (iAmChallenger ? g.opponentName : g.challengerName) ?? '';
        if (rivalId) {
            const rival = rivals.get(rivalId) ?? { id: rivalId, name: rivalName.trim(), wins: 0, losses: 0 };
            if (won) rival.wins++; else rival.losses++;
            rivals.set(rivalId, rival);
        }
        recent.push({
            id: g.id, opponentId: rivalId, opponentName: rivalName.trim(), won, challenger: iAmChallenger,
            myRounds: mine.rounds, theirRounds: theirs.rounds, myHits: mine.hits, theirHits: theirs.hits,
            cupSize: g.cupSize && SIZES.has(g.cupSize) ? g.cupSize : 'small',
            nakedMile: g.nakedMile ? (loserNaked ? 'me' : 'them') : null,
            date: g.completedAt ?? g.createdAt,
        });
    }

    if (roundsOfWins.length) {
        profile.bestRounds = Math.min(...roundsOfWins);
        profile.averageRounds = Math.round((roundsOfWins.reduce((a, b) => a + b, 0) / roundsOfWins.length) * 10) / 10;
    }
    profile.headToHead = [...rivals.values()].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses) || b.wins - a.wins || a.name.localeCompare(b.name));
    profile.recentDuels = recent.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, recentLimit);
    return profile;
}
