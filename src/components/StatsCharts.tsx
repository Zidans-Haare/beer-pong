'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlayerStats } from '@/lib/stats';

export default function StatsCharts({ stats }: { stats: PlayerStats[] }) {
    // Transform data for charts
    // We want to compare top 5 players history?
    // Or just show one aggregate chart?
    // Let's show WinRate trends for Top 5 Players.

    const top5 = stats.slice(0, 5);

    // We need to normalize the history data to common timeline or just index-based?
    // Index based is easier for "Games Played" axis.

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-8)' }}>
            <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-primary)' }}>Winrate Trend (Top 5)</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                                stroke="var(--color-text-dim)"
                            />
                            <YAxis stroke="var(--color-text-dim)" unit="%" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'white' }}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                            />
                            {top5.map((p, i) => (
                                <Line
                                    key={p.id}
                                    data={p.history.map((h) => ({ timestamp: h.timestamp, winRate: h.winRate }))}
                                    dataKey="winRate"
                                    name={p.name}
                                    type="monotone"
                                    stroke={`hsl(${i * 60}, 70%, 50%)`}
                                    activeDot={{ r: 8 }}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-secondary)' }}>Becherdifferenz (Top 10)</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="var(--color-text-dim)" />
                            <YAxis stroke="var(--color-text-dim)" />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'white' }}
                            />
                            <Bar dataKey="cupDiff" fill="var(--color-success)" name="Becherdiff." radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
