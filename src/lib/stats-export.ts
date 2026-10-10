import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { getAllPlayerStats, computePlacements } from '@/lib/stats';
import { getStatsInsights, type StatsInsights } from '@/lib/stats-insights';
import { getSeasons, findSeasonForDate, seasonRange, type SeasonRange } from '@/lib/seasons';
import { getTournamentTypeLabel } from '@/lib/tournament-utils';

// Vollständiger Excel-Export: alle Saisons, Turniere und Spiele in einer Arbeitsmappe.
// Jedes Blatt ist eine Tabelle mit fixierter Kopfzeile und Filter.

type Cell = string | number | Date | null;
interface Column { header: string; width: number; numFmt?: string; align?: 'left' | 'right' | 'center' }

const HEADER_FILL = 'FF006B50';
const STATUS_LABELS: Record<string, string> = { PLANNED: 'Geplant', ACTIVE: 'Läuft', COMPLETED: 'Abgeschlossen' };
const MEDAL_LABELS = { gold: 'Gold', silver: 'Silber', bronze: 'Bronze' } as const;

function addTable(wb: ExcelJS.Workbook, name: string, columns: Column[], rows: Cell[][]) {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = columns.map(c => ({ width: c.width, style: { numFmt: c.numFmt, alignment: { horizontal: c.align ?? 'left', vertical: 'middle' } } }));
    const header = ws.addRow(columns.map(c => c.header));
    header.height = 22;
    header.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    for (const row of rows) ws.addRow(row);
    if (rows.length > 0) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
    return ws;
}

const rankingColumns: Column[] = [
    { header: 'Platz', width: 7, align: 'right' },
    { header: 'Spieler', width: 22 },
    { header: 'Gold', width: 7, align: 'right' },
    { header: 'Silber', width: 7, align: 'right' },
    { header: 'Bronze', width: 8, align: 'right' },
    { header: 'Siege', width: 8, align: 'right' },
    { header: 'Niederlagen', width: 13, align: 'right' },
    { header: 'Spiele', width: 8, align: 'right' },
    { header: 'Siegquote', width: 11, numFmt: '0%', align: 'right' },
    { header: 'Becher +/-', width: 11, align: 'right' },
    { header: 'Becher/Spiel', width: 13, numFmt: '0.0', align: 'right' },
    { header: 'Turniere', width: 10, align: 'right' },
    { header: 'Längste Siegesserie', width: 19, align: 'right' },
];

// Rangliste (nur Liga-Turniere), nach Medaillen sortiert wie auf der Statistik-Seite
async function rankingRows(range: SeasonRange | undefined, insights: StatsInsights): Promise<Cell[][]> {
    const stats = (await getAllPlayerStats(true, 'all', range))
        .filter(s => s.matchesPlayed > 0 || s.goldMedals + s.silverMedals + s.bronzeMedals > 0);
    const streak = new Map(insights.players.map(p => [p.id, p.longestWinStreak]));
    return stats.map((s, i) => [
        i + 1, s.name.trim(), s.goldMedals, s.silverMedals, s.bronzeMedals,
        s.matchesWon, s.matchesPlayed - s.matchesWon, s.matchesPlayed,
        s.matchesPlayed > 0 ? s.winRate : null,
        s.cupDiff,
        s.matchesPlayed > 0 ? s.cupDiff / s.matchesPlayed : null,
        s.tournamentsPlayed,
        streak.get(s.id) ?? 0,
    ]);
}

function recordRows(scope: string, insights: StatsInsights): Cell[][] {
    return insights.records.map(r => {
        switch (r.key) {
            case 'winStreak': return [scope, 'Längste Siegesserie', r.player, `${r.count} Siege in Folge`, null];
            case 'biggestWin': return [scope, 'Höchster Sieg', r.player, `${r.score} gegen ${r.opponent}`, r.tournament];
            case 'cupsInTournament': return [scope, 'Meiste Becher in einem Turnier', r.player, `${r.cups} Becher in ${r.games} Spielen`, r.tournament];
            case 'longestMatch': return [scope, 'Längstes Spiel', r.player, `${r.minutes} Min gegen ${r.opponent}`, r.tournament];
        }
    });
}

export async function buildStatsWorkbook(): Promise<Buffer> {
    const [seasons, tournaments, matches, standings, players, placements, allInsights] = await Promise.all([
        getSeasons(),
        prisma.tournament.findMany({ orderBy: { date: 'asc' }, include: { _count: { select: { participants: true } } } }),
        prisma.match.findMany({
            where: { isPlayed: true },
            include: {
                player1: { select: { name: true } }, player2: { select: { name: true } },
                team1: { select: { name: true } }, team2: { select: { name: true } },
            },
        }),
        prisma.tournamentStanding.findMany({ include: { player: { select: { name: true } } } }),
        prisma.player.findMany({ select: { id: true, name: true } }),
        computePlacements(false),
        getStatsInsights(true),
    ]);

    const seasonsAsc = [...seasons].reverse();
    const seasonName = (date: Date) => findSeasonForDate(seasons, date)?.name ?? '';
    const playerName = new Map(players.map(p => [p.id, p.name.trim()]));
    const tournamentById = new Map(tournaments.map(t => [t.id, t]));
    const yesNo = (value: boolean) => (value ? 'Ja' : 'Nein');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Bier Pong';
    wb.created = new Date();

    // ---- Übersicht ----
    const overview = wb.addWorksheet('Übersicht');
    overview.columns = [{ width: 28 }, { width: 70 }];
    const title = overview.addRow(['Bier Pong – Statistik-Export']);
    title.font = { bold: true, size: 16 };
    overview.addRow(['Erstellt am', new Date()]).getCell(2).numFmt = 'dd.mm.yyyy hh:mm';
    overview.getCell('B2').alignment = { horizontal: 'left' };
    overview.addRow([]);
    const completed = tournaments.filter(t => t.status === 'COMPLETED');
    for (const [label, value] of [
        ['Saisons', seasons.length],
        ['Turniere gesamt', tournaments.length],
        ['davon abgeschlossen', completed.length],
        ['Gespielte Spiele', matches.length],
        ['Spieler in der Rangliste', (await getAllPlayerStats(true, 'all')).filter(s => s.matchesPlayed > 0).length],
    ] as [string, number][]) {
        const row = overview.addRow([label, value]);
        row.getCell(1).font = { bold: true };
        row.getCell(2).alignment = { horizontal: 'left' };
    }
    overview.addRow([]);
    overview.addRow(['Blatt', 'Inhalt']).font = { bold: true };
    for (const [sheet, text] of [
        ['Rangliste', 'Alle Saisons zusammen, nur Liga-Turniere, sortiert nach Medaillen'],
        ['Rangliste je Saison', 'Dieselbe Rangliste getrennt nach Saison'],
        ['Turniere', 'Alle Turniere mit Saison, Art, Teilnehmerzahl und Podium'],
        ['Spiele', 'Jedes gespielte Spiel mit Ergebnis, Phase, Tisch und Dauer'],
        ['Turniertabellen', 'Abschlusstabellen der Gruppen- und Ligaphasen'],
        ['Direkter Vergleich', 'Siege–Niederlagen jedes Spielers (Zeile) gegen jeden Gegner (Spalte), nur Liga-Turniere'],
        ['Rekorde', 'Bestmarken gesamt und je Saison, nur Liga-Turniere'],
    ]) overview.addRow([sheet, text]);
    overview.addRow([]);
    overview.addRow(['Hinweis', 'Medaillen enthalten historische Turniere ohne Spieldaten. Siege, Quoten und Becher stammen nur aus Turnieren mit erfassten Spielen.']).getCell(2).alignment = { wrapText: true, vertical: 'top' };

    // ---- Rangliste ----
    addTable(wb, 'Rangliste', rankingColumns, await rankingRows(undefined, allInsights));

    const perSeason: Cell[][] = [];
    const recordsAll: Cell[][] = recordRows('Alle Saisons', allInsights);
    for (const season of seasonsAsc) {
        const range = seasonRange(season);
        const insights = await getStatsInsights(true, range);
        for (const row of await rankingRows(range, insights)) perSeason.push([season.name, ...row]);
        recordsAll.push(...recordRows(season.name, insights));
    }
    addTable(wb, 'Rangliste je Saison', [{ header: 'Saison', width: 14 }, ...rankingColumns], perSeason);

    // ---- Turniere ----
    const podiumNames = (tournamentId: string, medal: keyof typeof MEDAL_LABELS) =>
        [...(placements.podiumByTournament.get(tournamentId) ?? [])]
            .filter(([, m]) => m === medal).map(([id]) => playerName.get(id) ?? '').filter(Boolean).join(', ');
    const playedByTournament = new Map<string, number>();
    for (const m of matches) playedByTournament.set(m.tournamentId, (playedByTournament.get(m.tournamentId) ?? 0) + 1);

    addTable(wb, 'Turniere', [
        { header: 'Datum', width: 12, numFmt: 'dd.mm.yyyy' },
        { header: 'Turnier', width: 34 },
        { header: 'Saison', width: 14 },
        { header: 'Ort', width: 22 },
        { header: 'Modus', width: 9 },
        { header: 'Format', width: 20 },
        { header: 'Status', width: 15 },
        { header: 'Liga-Turnier', width: 13 },
        { header: 'Historisch', width: 11 },
        { header: 'Teilnehmer', width: 11, align: 'right' },
        { header: 'Spiele', width: 8, align: 'right' },
        { header: 'Gold', width: 18 },
        { header: 'Silber', width: 18 },
        { header: 'Bronze', width: 18 },
    ], tournaments.map(t => [
        t.date, t.name.trim(), seasonName(t.date), t.location, t.mode === 'TEAM' ? '2v2' : '1v1',
        getTournamentTypeLabel(t.type), STATUS_LABELS[t.status] ?? t.status, yesNo(t.isRanked), yesNo(t.isHistorical),
        t._count.participants, playedByTournament.get(t.id) ?? 0,
        podiumNames(t.id, 'gold'), podiumNames(t.id, 'silver'), podiumNames(t.id, 'bronze'),
    ]));

    // ---- Spiele ----
    const sortedMatches = [...matches].sort((a, b) => {
        const ta = tournamentById.get(a.tournamentId)!, tb = tournamentById.get(b.tournamentId)!;
        return ta.date.getTime() - tb.date.getTime() || a.tournamentId.localeCompare(b.tournamentId)
            || Number(a.stage === 'BRACKET') - Number(b.stage === 'BRACKET') || a.round - b.round || a.position - b.position;
    });
    addTable(wb, 'Spiele', [
        { header: 'Datum', width: 12, numFmt: 'dd.mm.yyyy' },
        { header: 'Turnier', width: 34 },
        { header: 'Saison', width: 14 },
        { header: 'Liga-Turnier', width: 13 },
        { header: 'Phase', width: 11 },
        { header: 'Runde', width: 8, align: 'right' },
        { header: 'Tisch', width: 7, align: 'right' },
        { header: 'Seite 1', width: 22 },
        { header: 'Seite 2', width: 22 },
        { header: 'Becher 1', width: 10, align: 'right' },
        { header: 'Becher 2', width: 10, align: 'right' },
        { header: 'Sieger', width: 22 },
        { header: 'Dauer (Min)', width: 12, numFmt: '0.0', align: 'right' },
    ], sortedMatches.map(m => {
        const t = tournamentById.get(m.tournamentId)!;
        const side1 = (m.player1?.name ?? m.team1?.name ?? '').trim();
        const side2 = (m.player2?.name ?? m.team2?.name ?? '').trim();
        const seconds = m.durationSeconds ?? (m.completedAt && m.startedAt ? (m.completedAt.getTime() - m.startedAt.getTime()) / 1000 : null);
        const winner = m.score1 === m.score2 ? '' : (m.winnerId ? (m.winnerId === m.player1Id ? side1 : side2) : (m.winnerTeamId === m.team1Id ? side1 : side2));
        return [
            t.date, t.name.trim(), seasonName(t.date), yesNo(t.isRanked),
            m.stage === 'BRACKET' ? 'K.-o.' : 'Liga', m.round, m.tableNumber,
            side1, side2, m.score1, m.score2, winner,
            seconds !== null && seconds >= 60 && seconds <= 3600 ? seconds / 60 : null,
        ];
    }));

    // ---- Turniertabellen ----
    const sortedStandings = [...standings].sort((a, b) => {
        const ta = tournamentById.get(a.tournamentId), tb = tournamentById.get(b.tournamentId);
        return (ta?.date.getTime() ?? 0) - (tb?.date.getTime() ?? 0) || a.tournamentId.localeCompare(b.tournamentId)
            || a.groupId - b.groupId || b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;
    });
    let place = 0, lastGroup = '';
    addTable(wb, 'Turniertabellen', [
        { header: 'Datum', width: 12, numFmt: 'dd.mm.yyyy' },
        { header: 'Turnier', width: 34 },
        { header: 'Gruppe', width: 8, align: 'right' },
        { header: 'Platz', width: 7, align: 'right' },
        { header: 'Spieler', width: 22 },
        { header: 'Spiele', width: 8, align: 'right' },
        { header: 'Siege', width: 8, align: 'right' },
        { header: 'Niederlagen', width: 13, align: 'right' },
        { header: 'Becher getroffen', width: 16, align: 'right' },
        { header: 'Becher kassiert', width: 15, align: 'right' },
        { header: 'Becher +/-', width: 11, align: 'right' },
        { header: 'Punkte', width: 8, align: 'right' },
    ], sortedStandings.map(s => {
        const t = tournamentById.get(s.tournamentId);
        const group = `${s.tournamentId}:${s.groupId}`;
        place = group === lastGroup ? place + 1 : 1;
        lastGroup = group;
        return [t?.date ?? null, t?.name.trim() ?? '', s.groupId + 1, place, s.player.name.trim(), s.played, s.won, s.lost, s.goalsFor, s.goalsAgainst, s.goalDifference, s.points];
    }));

    // ---- Direkter Vergleich ----
    const h2h = [...allInsights.players].sort((a, b) => a.name.localeCompare(b.name));
    const matrix = addTable(wb, 'Direkter Vergleich',
        [{ header: 'Spieler ↓ gegen →', width: 22 }, ...h2h.map(p => ({ header: p.name, width: Math.max(8, p.name.length + 2), align: 'center' as const }))],
        h2h.map(p => [p.name, ...h2h.map(o => {
            if (o.id === p.id) return '×';
            const record = p.opponents.find(x => x.opponentId === o.id);
            return record ? `${record.wins}–${record.losses}` : null;
        })]));
    matrix.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];
    matrix.getColumn(1).font = { bold: true };
    matrix.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // ---- Rekorde ----
    addTable(wb, 'Rekorde', [
        { header: 'Zeitraum', width: 16 },
        { header: 'Rekord', width: 32 },
        { header: 'Spieler', width: 22 },
        { header: 'Wert', width: 30 },
        { header: 'Turnier', width: 34 },
    ], recordsAll);

    return Buffer.from(await wb.xlsx.writeBuffer());
}
