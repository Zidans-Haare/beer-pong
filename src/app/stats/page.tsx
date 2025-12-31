import { getAllPlayerStats } from '@/lib/stats';
import StatsCharts from '@/components/StatsCharts';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
    const stats = await getAllPlayerStats();

    return (
        <div className="container">
            <h1 className="title-gradient" style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-8)' }}>Ewige Tabelle & Statistiken</h1>

            <StatsCharts stats={stats} />

            <div className="glass-panel" style={{ overflowX: 'auto', marginTop: 'var(--spacing-12)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: 'var(--spacing-4)' }}>Rang</th>
                            <th style={{ padding: 'var(--spacing-4)' }}>Spieler</th>
                            <th style={{ padding: 'var(--spacing-4)' }}>Siege</th>
                            <th style={{ padding: 'var(--spacing-4)' }}>Spiele</th>
                            <th style={{ padding: 'var(--spacing-4)' }}>Winrate</th>
                            <th style={{ padding: 'var(--spacing-4)' }}>Becherdiff.</th>
                            <th style={{ padding: 'var(--spacing-4)' }}>Turniere</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((s, idx) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: 'var(--spacing-4)' }}>{idx + 1}.</td>
                                <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold', color: 'var(--color-primary)' }}>{s.name}</td>
                                <td style={{ padding: 'var(--spacing-4)', color: 'var(--color-success)' }}>{s.matchesWon}</td>
                                <td style={{ padding: 'var(--spacing-4)' }}>{s.matchesPlayed}</td>
                                <td style={{ padding: 'var(--spacing-4)' }}>{Math.round(s.winRate * 100)}%</td>
                                <td style={{ padding: 'var(--spacing-4)', color: s.cupDiff > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                    {s.cupDiff > 0 ? `+${s.cupDiff}` : s.cupDiff}
                                </td>
                                <td style={{ padding: 'var(--spacing-4)' }}>{s.tournamentsPlayed}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
