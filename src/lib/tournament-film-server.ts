import 'server-only';
import { prisma } from '@/lib/prisma';
import { computePlacements } from '@/lib/stats';
import type { FilmInput, FilmMatch, FilmParty } from '@/lib/tournament-film';

type Person = { id: string; name: string } | null;
type TeamRow = { id: string; name: string | null; player1: Person; player2: Person; guest1: Person; guest2: Person } | null;

const person = { select: { id: true, name: true } } as const;
const team = { include: { player1: person, player2: person, guest1: person, guest2: person } } as const;

function teamParty(row: TeamRow): FilmParty | null {
    if (!row) return null;
    const members = [
        ...[row.player1, row.player2].filter((p): p is NonNullable<Person> => !!p).map(p => ({ id: p.id, name: p.name.trim() })),
        ...[row.guest1, row.guest2].filter((p): p is NonNullable<Person> => !!p).map(p => ({ id: `guest:${p.id}`, name: p.name.trim() })),
    ];
    if (members.length === 0) return null;
    const names = members.map(m => m.name);
    return { ids: members.map(m => m.id), names, label: row.name?.trim() || names.join(' & ') };
}

const soloParty = (p: Person): FilmParty | null => (p ? { ids: [p.id], names: [p.name.trim()], label: p.name.trim() } : null);

// Daten für den Film eines abgeschlossenen Turniers; null, wenn es keins ist oder nichts gespielt wurde
export async function loadTournamentFilm(id: string): Promise<FilmInput | null> {
    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            matches: { where: { isPlayed: true }, include: { player1: person, player2: person, team1: team, team2: team } },
        },
    });
    if (!tournament || tournament.status !== 'COMPLETED') return null;

    const isTeam = tournament.mode === 'TEAM';
    const matches: FilmMatch[] = [];
    for (const m of tournament.matches) {
        const side1 = isTeam ? teamParty(m.team1) : soloParty(m.player1);
        const side2 = isTeam ? teamParty(m.team2) : soloParty(m.player2);
        if (!side1 || !side2) continue;
        const winner = isTeam
            ? (m.winnerTeamId ? (m.winnerTeamId === m.team1Id ? 1 : 2) : null)
            : (m.winnerId ? (m.winnerId === m.player1Id ? 1 : 2) : null);
        matches.push({
            stage: m.stage, round: m.round, completedAt: m.completedAt?.getTime() ?? null, durationSeconds: m.durationSeconds,
            // nachgetragene Turniere haben nur Platzhalter als Ergebnis; die zeigt der Film nicht
            score1: tournament.isHistorical ? 0 : m.score1, score2: tournament.isHistorical ? 0 : m.score2, side1, side2, winner,
        });
    }
    if (matches.length === 0) return null;

    const podium = (await computePlacements(false)).podiumByTournament.get(id) ?? new Map();
    const players = await prisma.player.findMany({ where: { id: { in: [...podium.keys()] } }, select: { id: true, name: true } });
    const ids = new Set(matches.flatMap(m => [...m.side1.ids, ...m.side2.ids]));

    return {
        name: tournament.name, date: tournament.date, playerCount: ids.size, matches, podium,
        playerNames: new Map(players.map(p => [p.id, p.name.trim()])),
    };
}
