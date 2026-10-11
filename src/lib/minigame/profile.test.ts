import { describe, it, expect } from 'vitest';
import { buildMiniGameProfile, type ProfileGame } from './profile';

const game = (extra: Partial<ProfileGame>): ProfileGame => ({
    id: Math.random().toString(36).slice(2), mode: 'DUEL', status: 'COMPLETED', difficulty: null, cupSize: 'small',
    challengerId: 'nick', opponentId: 'paul', challengerName: 'Nick', opponentName: 'Paul',
    challengerRounds: 5, opponentRounds: 6, challengerHits: 10, opponentHits: 9, winner: 'CHALLENGER', nakedMile: null,
    createdAt: new Date('2026-10-01T10:00:00Z'), completedAt: new Date('2026-10-01T11:00:00Z'), ...extra,
});

describe('Minispiel-Bilanz im Profil', () => {
    const games: ProfileGame[] = [
        // gegen den Computer
        game({ mode: 'CPU', opponentId: null, opponentName: null, difficulty: 'easy', winner: 'CHALLENGER', challengerRounds: 7, challengerHits: 10 }),
        game({ mode: 'CPU', opponentId: null, opponentName: null, difficulty: 'hard', winner: 'OPPONENT', challengerRounds: 9, challengerHits: 8 }),
        game({ mode: 'CPU', opponentId: null, opponentName: null, difficulty: null, winner: 'CHALLENGER', challengerRounds: 5, challengerHits: 10 }),
        // Duelle: Nick legt vor und gewinnt, legt vor und verliert, zieht nach und gewinnt
        game({ winner: 'CHALLENGER', challengerRounds: 4, completedAt: new Date('2026-10-02T10:00:00Z') }),
        game({ winner: 'OPPONENT', challengerRounds: 6, opponentRounds: 5, completedAt: new Date('2026-10-03T10:00:00Z'), cupSize: 'large' }),
        game({ challengerId: 'tom', challengerName: 'Tom', opponentId: 'nick', opponentName: 'Nick', winner: 'OPPONENT', challengerRounds: 8, opponentRounds: 6, challengerHits: 7, opponentHits: 10, completedAt: new Date('2026-10-04T10:00:00Z'), nakedMile: 'CHALLENGER' }),
        // offen und abgelehnt
        game({ status: 'PENDING', completedAt: null }),
        game({ challengerId: 'tom', challengerName: 'Tom', opponentId: 'nick', opponentName: 'Nick', status: 'PENDING', completedAt: null }),
        game({ status: 'DECLINED' }),
        // ein fremdes Spiel zählt nicht
        game({ challengerId: 'anna', challengerName: 'Anna', opponentId: 'tom', opponentName: 'Tom' }),
    ];
    const profile = buildMiniGameProfile('nick', games);

    it('zählt Spiele, Siege und Niederlagen über Computer und Duelle', () => {
        expect(profile).toMatchObject({ games: 6, wins: 4, losses: 2 });
        expect(profile.hits).toBe(10 + 8 + 10 + 10 + 10 + 10);
    });

    it('schlüsselt den Computer nach Stufe auf, ohne Stufe gilt Normal', () => {
        expect(profile.cpu).toEqual({ games: 3, wins: 2, byLevel: { easy: { games: 1, wins: 1 }, normal: { games: 1, wins: 1 }, hard: { games: 1, wins: 0 } } });
    });

    it('trennt Duelle nach Rolle und zählt offene und abgelehnte', () => {
        expect(profile.duels).toMatchObject({ games: 3, wins: 2, losses: 1, asChallenger: { games: 2, wins: 1 }, asOpponent: { games: 1, wins: 1 }, waitingForMe: 1, waitingForThem: 1, declined: 1 });
    });

    it('rechnet Runden aus der eigenen Sicht, auch wenn man nachgezogen hat', () => {
        // Siege: 7, 5 (Computer), 4 (vorgelegt), 6 (nachgezogen)
        expect(profile.bestRounds).toBe(4);
        expect(profile.averageRounds).toBe(5.5);
        const caughtUp = profile.recentDuels.find(d => !d.challenger)!;
        expect(caughtUp).toMatchObject({ opponentName: 'Tom', won: true, myRounds: 6, theirRounds: 8, myHits: 10, theirHits: 7 });
    });

    it('führt den direkten Vergleich je Gegner', () => {
        expect(profile.headToHead).toEqual([
            { id: 'paul', name: 'Paul', wins: 1, losses: 1 },
            { id: 'tom', name: 'Tom', wins: 1, losses: 0 },
        ]);
    });

    it('listet die letzten Duelle, neueste zuerst, mit Becher-Größe und nackter Meile', () => {
        expect(profile.recentDuels.map(d => d.opponentName)).toEqual(['Tom', 'Paul', 'Paul']);
        expect(profile.recentDuels[0].nakedMile).toBe('them');
        expect(profile.recentDuels[1].cupSize).toBe('large');
        expect(profile.nakedMiles).toEqual({ ran: 0, made: 1 });
    });

    it('der Computer hat keine eigene Bilanz und ein leerer Spieler bekommt eine leere', () => {
        // wer das Computerspiel nicht gespielt hat, sieht es nicht in seiner Bilanz
        expect(buildMiniGameProfile('paul', games.filter(g => g.mode === 'CPU')).games).toBe(0);
        const empty = buildMiniGameProfile('niemand', games);
        expect(empty).toMatchObject({ games: 0, bestRounds: null, averageRounds: null, headToHead: [], recentDuels: [] });
    });
});
