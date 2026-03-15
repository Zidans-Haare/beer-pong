'use client';

import { Download } from 'lucide-react';
import type { PlayerStats } from '@/lib/stats';

interface Props {
    stats: PlayerStats[];
}

export default function StatsExportButton({ stats }: Props) {
    async function handleExport() {
        const XLSX = await import('xlsx');

        // Sheet 1: Ewige Tabelle
        const ewigeTabelle = stats.map((s, idx) => ({
            Rang: idx + 1,
            Spieler: s.name,
            Siege: s.matchesWon,
            Spiele: s.matchesPlayed,
            'Win Rate (%)': Math.round(s.winRate * 100),
            '+/-': s.cupDiff,
            Pokale: s.tournamentsWon,
            'Ø / Turnier': s.tournamentsPlayed > 0
                ? parseFloat((s.tournamentsWon / s.tournamentsPlayed).toFixed(2))
                : 0,
        }));

        // Sheet 2: Turnier-Effizienz
        const effizienz = [...stats]
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
                'Quote (%)': Math.round((s.tournamentsWon / s.tournamentsPlayed) * 100),
                Pokale: s.tournamentsWon,
                Turniere: s.tournamentsPlayed,
            }));

        // Sheet 3: Rohdaten
        const rohdaten = stats.map(s => ({
            Spieler: s.name,
            Siege: s.matchesWon,
            Niederlagen: s.matchesPlayed - s.matchesWon,
            Spiele: s.matchesPlayed,
            'Win Rate (%)': Math.round(s.winRate * 100),
            'Cups getroffen': s.cupDiff > 0 ? '+' + s.cupDiff : s.cupDiff,
            'Turniersiege': s.tournamentsWon,
            'Turniere gespielt': s.tournamentsPlayed,
        }));

        const wb = XLSX.utils.book_new();

        const ws1 = XLSX.utils.json_to_sheet(ewigeTabelle);
        const ws2 = XLSX.utils.json_to_sheet(effizienz);
        const ws3 = XLSX.utils.json_to_sheet(rohdaten);

        // Spaltenbreiten
        ws1['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 12 }];
        ws2['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 10 }];
        ws3['!cols'] = [{ wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];

        XLSX.utils.book_append_sheet(wb, ws1, 'Ewige Tabelle');
        XLSX.utils.book_append_sheet(wb, ws2, 'Turnier-Effizienz');
        XLSX.utils.book_append_sheet(wb, ws3, 'Rohdaten');

        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `bierpong-stats-${date}.xlsx`);
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
