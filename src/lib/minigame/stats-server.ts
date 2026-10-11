import 'server-only';
import { prisma } from '@/lib/prisma';
import { buildMiniGameProfile, type MiniGameProfile, type ProfileGame } from '@/lib/minigame/profile';

export interface MiniGameRow {
    id: string;
    name: string;
    games: number;
    wins: number;
    duels: number;
    duelWins: number;
    // schnellster Sieg in Runden (nur Spiele, die man gewonnen hat)
    bestRounds: number | null;
    hits: number;
}

// Bilanz aller abgeschlossenen Minispiele je Spieler. Spiele gegen den Rechner und Duelle zählen beide.
export async function getMiniGameStats(): Promise<MiniGameRow[]> {
    const games = await prisma.miniGame.findMany({
        where: { status: 'COMPLETED' },
        select: {
            mode: true, winner: true, challengerId: true, opponentId: true, challengerRounds: true, opponentRounds: true, challengerHits: true, opponentHits: true,
            challenger: { select: { id: true, name: true } }, opponent: { select: { id: true, name: true } },
        },
    }).catch(() => []);

    const rows = new Map<string, MiniGameRow>();
    const row = (player: { id: string; name: string }) => {
        let r = rows.get(player.id);
        if (!r) { r = { id: player.id, name: player.name.trim(), games: 0, wins: 0, duels: 0, duelWins: 0, bestRounds: null, hits: 0 }; rows.set(player.id, r); }
        return r;
    };
    for (const g of games) {
        const parties = [
            { player: g.challenger, won: g.winner === 'CHALLENGER', rounds: g.challengerRounds, hits: g.challengerHits },
            // der Rechner hat keine Bilanz
            ...(g.opponent && g.mode === 'DUEL' ? [{ player: g.opponent, won: g.winner === 'OPPONENT', rounds: g.opponentRounds, hits: g.opponentHits }] : []),
        ];
        for (const p of parties) {
            const r = row(p.player);
            r.games++;
            r.hits += p.hits ?? 0;
            if (p.won) {
                r.wins++;
                if (p.rounds && p.rounds > 0 && (r.bestRounds === null || p.rounds < r.bestRounds)) r.bestRounds = p.rounds;
            }
            if (g.mode === 'DUEL') { r.duels++; if (p.won) r.duelWins++; }
        }
    }
    return [...rows.values()].sort((a, b) => b.wins - a.wins || b.wins / b.games - a.wins / a.games || b.games - a.games || a.name.localeCompare(b.name));
}

// Aufgeschlüsselte Bilanz eines Spielers für sein Profil
export async function getMiniGameProfile(playerId: string): Promise<MiniGameProfile> {
    const rows = await prisma.miniGame.findMany({
        where: { OR: [{ challengerId: playerId }, { opponentId: playerId }] },
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: { challenger: { select: { name: true } }, opponent: { select: { name: true } } },
    }).catch(() => []);
    const games: ProfileGame[] = rows.map(r => ({
        id: r.id, mode: r.mode === 'DUEL' ? 'DUEL' : 'CPU',
        status: r.status === 'PENDING' || r.status === 'PLAYING' ? 'PENDING' : r.status === 'DECLINED' ? 'DECLINED' : 'COMPLETED',
        difficulty: r.difficulty, cupSize: r.cupSize, challengerId: r.challengerId, opponentId: r.opponentId,
        challengerName: r.challenger.name, opponentName: r.opponent?.name ?? null,
        challengerRounds: r.challengerRounds, opponentRounds: r.opponentRounds, challengerHits: r.challengerHits, opponentHits: r.opponentHits,
        winner: r.winner === 'CHALLENGER' || r.winner === 'OPPONENT' ? r.winner : null,
        nakedMile: r.nakedMile === 'CHALLENGER' || r.nakedMile === 'OPPONENT' ? r.nakedMile : null,
        createdAt: r.createdAt, completedAt: r.completedAt,
    }));
    return buildMiniGameProfile(playerId, games);
}
