'use client';

import { Download } from 'lucide-react';
import type { PlayerStats } from '@/lib/stats';

interface Props {
    stats: PlayerStats[];
}

export default function StatsExportButton({ stats }: Props) {
    async function handleExport() {
        const ExcelJS = await import('exceljs');
        const wb = new ExcelJS.Workbook();

        // Sheet 1: Ewige Tabelle
        const ws1 = wb.addWorksheet('Ewige Tabelle');
        ws1.columns = [
            { header: 'Rang', key: 'Rang', width: 6 },
            { header: 'Spieler', key: 'Spieler', width: 20 },
            { header: 'Siege', key: 'Siege', width: 8 },
            { header: 'Spiele', key: 'Spiele', width: 8 },
            { header: 'Win Rate (%)', key: 'WinRate', width: 12 },
            { header: '+/-', key: 'CupDiff', width: 6 },
            { header: 'Pokale', key: 'Pokale', width: 8 },
            { header: 'Ø / Turnier', key: 'AvgTurnier', width: 12 },
        ];
        ws1.addRows(stats.map((s, idx) => ({
            Rang: idx + 1,
            Spieler: s.name,
            Siege: s.matchesWon,
            Spiele: s.matchesPlayed,
            WinRate: Math.round(s.winRate * 100),
            CupDiff: s.cupDiff,
            Pokale: s.tournamentsWon,
            AvgTurnier: s.tournamentsPlayed > 0
                ? parseFloat((s.tournamentsWon / s.tournamentsPlayed).toFixed(2))
                : 0,
        })));

        // Sheet 2: Turnier-Effizienz
        const ws2 = wb.addWorksheet('Turnier-Effizienz');
        ws2.columns = [
            { header: 'Rang', key: 'Rang', width: 6 },
            { header: 'Spieler', key: 'Spieler', width: 20 },
            { header: 'Quote (%)', key: 'Quote', width: 12 },
            { header: 'Pokale', key: 'Pokale', width: 8 },
            { header: 'Turniere', key: 'Turniere', width: 10 },
        ];
        ws2.addRows([...stats]
            .filter(s => s.tournamentsPlayed > 0)
            .sort((a, b) => {
                const rateA = a.tournamentsWon / a.tournamentsPlayed;
                const rateB = b.tournamentsWon / b.tournamentsPlayed;
                if (rateB !== rateA) return rateB - rateA;
                return b.tournamentsWon - a.tournamentsWon;
            })
            .map((s, idx) => ({
                Rang: idx + 1,
                Spieler: s.name,
                Quote: Math.round((s.tournamentsWon / s.tournamentsPlayed) * 100),
                Pokale: s.tournamentsWon,
                Turniere: s.tournamentsPlayed,
            })));

        // Sheet 3: Rohdaten
        const ws3 = wb.addWorksheet('Rohdaten');
        ws3.columns = [
            { header: 'Spieler', key: 'Spieler', width: 20 },
            { header: 'Siege', key: 'Siege', width: 8 },
            { header: 'Niederlagen', key: 'Niederlagen', width: 12 },
            { header: 'Spiele', key: 'Spiele', width: 8 },
            { header: 'Win Rate (%)', key: 'WinRate', width: 12 },
            { header: 'Cups getroffen', key: 'Cups', width: 14 },
            { header: 'Turniersiege', key: 'Turniersiege', width: 14 },
            { header: 'Turniere gespielt', key: 'TurnierGespielt', width: 18 },
        ];
        ws3.addRows(stats.map(s => ({
            Spieler: s.name,
            Siege: s.matchesWon,
            Niederlagen: s.matchesPlayed - s.matchesWon,
            Spiele: s.matchesPlayed,
            WinRate: Math.round(s.winRate * 100),
            Cups: s.cupDiff,
            Turniersiege: s.tournamentsWon,
            TurnierGespielt: s.tournamentsPlayed,
        })));

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bierpong-stats-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <button
            onClick={handleExport}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: 'rgba(255, 215, 0, 0.08)',
                border: '1px solid rgba(180, 83, 9, 0.4)',
                borderRadius: 'var(--radius-md)',
                color: '#b45309',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
            }}
        >
            <Download size={14} />
            Excel Export
        </button>
    );
}
