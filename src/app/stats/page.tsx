import { getAllPlayerStats } from '@/lib/stats';
import StatsCharts from '@/components/StatsCharts';
import { Trophy, Medal, Crown } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
    const stats = await getAllPlayerStats();

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ marginBottom: 'var(--spacing-8)' }}>
                <h1 className="title-display" style={{ fontSize: '2rem' }}>Statistiken</h1>
                <p className="subtitle" style={{ fontSize: '0.9rem' }}>Daten, Fakten & Legenden</p>
            </header>

            <StatsCharts stats={stats} />

            <div className="glass-panel" style={{ overflow: 'hidden', marginTop: 'var(--spacing-12)', padding: '0' }}>
                <div style={{ padding: 'var(--spacing-6)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={20} color="var(--color-primary)" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Ewige Tabelle</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <tr>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>RANG</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>SPIELER</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>SIEGE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>SPIELE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>WIN RATE</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>+/-</th>
                                <th style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontWeight: 600, fontSize: '0.85rem' }}>POKALE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s, idx) => {
                                const isTop3 = idx < 3;
                                const rankColor = idx === 0 ? '#ffd700' : (idx === 1 ? '#c0c0c0' : (idx === 2 ? '#cd7f32' : 'var(--color-text-dim)'));

                                return (
                                    <tr key={s.id} style={{
                                        borderBottom: '1px solid var(--color-border)',
                                        background: idx === 0 ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.1) 0%, transparent 100%)' : 'transparent'
                                    }}>
                                        <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold', color: rankColor, fontSize: '1.2rem', fontFamily: '"Outfit", sans-serif' }}>
                                            {idx === 0 && <Crown size={16} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }} />}
                                            {idx + 1}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', fontWeight: 'bold', fontSize: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {s.name}
                                                {isTop3 && <Medal size={14} color={rankColor} />}
                                            </div>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', color: 'white', fontWeight: 600 }}>{s.matchesWon}</td>
                                        <td style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-dim)' }}>{s.matchesPlayed}</td>
                                        <td style={{ padding: 'var(--spacing-4)', fontWeight: 600, color: s.winRate >= 0.5 ? 'var(--color-success)' : 'var(--color-text)' }}>
                                            {Math.round(s.winRate * 100)}%
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)', fontWeight: 600, color: s.cupDiff > 0 ? 'var(--color-success)' : (s.cupDiff < 0 ? 'var(--color-error)' : 'var(--color-text-dim)') }}>
                                            {s.cupDiff > 0 ? `+${s.cupDiff}` : s.cupDiff}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-4)' }}>{s.tournamentsPlayed}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
