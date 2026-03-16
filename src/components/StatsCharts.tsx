'use client';

import { useMemo, useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlayerStats } from '@/lib/stats';

export default function StatsCharts({ stats }: { stats: PlayerStats[] }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const processedData = useMemo(() => {
        const playersWithData = stats.map(p => ({
            ...p,
            filteredHistory: p.history,
            rangeCupDiff: p.cupDiff,
            rangeWinRate: p.winRate * 100,
        })).filter(p => p.filteredHistory.length > 0);

        const topWinRate = [...playersWithData]
            .sort((a, b) => b.rangeWinRate - a.rangeWinRate)
            .slice(0, 5);

        const topCupDiff = [...playersWithData]
            .sort((a, b) => b.rangeCupDiff - a.rangeCupDiff)
            .slice(0, 10);

        const topDuration = [...playersWithData]
            .sort((a, b) => b.filteredHistory.length - a.filteredHistory.length || a.name.localeCompare(b.name))
            .slice(0, 5);

        return { topWinRate, topCupDiff, topDuration };
    }, [stats]);

    const NEON_COLORS = ['#5048e5', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b']; // Exact match from design system

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-8)' }}>
            {/* Win Rate Chart */}
            <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-6)', color: 'var(--color-text)', fontSize: '1.1rem' }}>Siegquote Trend (Top 5)</h3>
                <div style={{ height: '300px' }}>
                    {mounted && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <LineChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis
                                    dataKey="timestamp"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                                    stroke="var(--color-text-dim)"
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis stroke="var(--color-text-dim)" unit="%" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)', boxShadow: 'var(--shadow-lg)' }}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                {processedData.topWinRate.map((p, i) => (
                                    <Line
                                        key={p.id}
                                        data={p.filteredHistory.map((h) => ({ timestamp: h.timestamp, winRate: h.winRate }))}
                                        dataKey="winRate"
                                        name={p.name}
                                        type="monotone"
                                        stroke={NEON_COLORS[i % NEON_COLORS.length]}
                                        strokeWidth={2}
                                        activeDot={{ r: 6, fill: 'white', stroke: NEON_COLORS[i % NEON_COLORS.length] }}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Game Duration Chart */}
            <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-6)', color: 'var(--color-text)', fontSize: '1.1rem' }}>Spielzeit Verlauf (Min)</h3>
                <div style={{ height: '300px' }}>
                    {mounted && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <LineChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis
                                    dataKey="timestamp"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                                    stroke="var(--color-text-dim)"
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis stroke="var(--color-text-dim)" unit="m" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)', boxShadow: 'var(--shadow-lg)' }}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    formatter={(value: any, name: string | undefined) => [`${Number(value).toFixed(1)} min`, name ?? 'Dauer']}
                                />
                                {processedData.topDuration.map((p, i) => (
                                    <Line
                                        key={p.id}
                                        data={p.filteredHistory
                                            // Filter out 0 duration games if any, just to be cleaner, or keep them to show anomalies
                                            .filter(h => h.duration > 0)
                                            .map((h) => ({ timestamp: h.timestamp, duration: h.duration / 60 }))}
                                        dataKey="duration"
                                        name={p.name}
                                        type="monotone"
                                        stroke={NEON_COLORS[i % NEON_COLORS.length]}
                                        strokeWidth={2}
                                        activeDot={{ r: 6, fill: 'white', stroke: NEON_COLORS[i % NEON_COLORS.length] }}
                                        dot={false}
                                        connectNulls={true}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Cup Diff Chart */}
            <div className="glass-panel" style={{ padding: 'var(--spacing-6)', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: 'var(--spacing-6)', color: 'var(--color-text)', fontSize: '1.1rem' }}>Becherdifferenz (Top 10)</h3>
                <div style={{ height: '300px' }}>
                    {mounted && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                            <BarChart data={processedData.topCupDiff} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                <XAxis dataKey="name" stroke="var(--color-text-dim)" tick={{ fontSize: 12 }} />
                                <YAxis stroke="var(--color-text-dim)" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)', boxShadow: 'var(--shadow-lg)' }}
                                />
                                <Bar dataKey="rangeCupDiff" fill="var(--color-secondary)" name="Becherdiff." radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
