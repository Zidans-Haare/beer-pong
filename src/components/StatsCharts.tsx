'use client';

import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlayerStats } from '@/lib/stats';
import { startOfMonth, startOfYear } from 'date-fns';

type RangeType = 'ALL' | 'MONTH' | 'YEAR' | 'LAST_5';

export default function StatsCharts({ stats }: { stats: PlayerStats[] }) {
    const [range, setRange] = useState<RangeType>('ALL');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const processedData = useMemo(() => {
        const now = new Date();
        const monthStart = startOfMonth(now).getTime();
        const yearStart = startOfYear(now).getTime();

        // Calculate stats for each player based on the range
        const playersWithRangeStats = stats.map(p => {
            let relevantHistory = [...p.history];
            let rangeWinRate = 0;
            let rangeCupDiff = 0;

            if (range === 'ALL') {
                rangeWinRate = p.winRate * 100;
                rangeCupDiff = p.cupDiff;
            } else {
                // Filter history
                let startIndex = 0;

                if (range === 'MONTH') {
                    startIndex = relevantHistory.findIndex(h => h.timestamp >= monthStart);
                } else if (range === 'YEAR') {
                    startIndex = relevantHistory.findIndex(h => h.timestamp >= yearStart);
                } else if (range === 'LAST_5') {
                    startIndex = Math.max(0, relevantHistory.length - 5);
                }

                if (startIndex === -1 || relevantHistory.length === 0) {
                    // No games in range
                    relevantHistory = [];
                    rangeWinRate = 0;
                    rangeCupDiff = 0;
                } else {
                    const endState = relevantHistory[relevantHistory.length - 1];
                    const startState = startIndex > 0 ? relevantHistory[startIndex - 1] : { cupDiff: 0, matchesWon: 0, matchesPlayed: 0 }; // Approx

                    // We need strict "matches won in range" to calc winrate properly?
                    // The history stores cumulative winRate. Recovering exact wins/losses from history snapshot is tricky without storing counts.
                    // But we added cupDiff to history.
                    // For WinRate: History stores cumulative.
                    // Let's just use the filtered history points for the LineChart.
                    relevantHistory = relevantHistory.slice(startIndex);

                    // For the BAR chart (Cup Diff), we need the delta.
                    // Delta = (End CupDiff) - (Start CupDiff)
                    const prevCupDiff = startIndex > 0 ? p.history[startIndex - 1].cupDiff : 0;
                    rangeCupDiff = endState.cupDiff - prevCupDiff;

                    // Winrate for sorting?
                    // If we want to sort by "Winrate in this period", we'd need to know wins/played in delta.
                    // We don't have that easily without re-parsing matches.
                    // Fallback: Use the final cumulative Winrate of the period? Or average?
                    // Let's stick to using the LATEST Winrate point for sorting for now, or keep "ALL" sorting for Winrate.
                    // User only asked for "Becherdifferenz" to adapt.
                    rangeWinRate = endState.winRate;
                }
            }

            return {
                ...p,
                filteredHistory: relevantHistory,
                rangeCupDiff,
                rangeWinRate
            };
        });

        // Filter out inactive players in range
        const activePlayers = playersWithRangeStats.filter(p =>
            range === 'ALL' ? true : p.filteredHistory.length > 0
        );

        // Top 5 Winrate
        const topWinRate = [...activePlayers]
            .sort((a, b) => b.rangeWinRate - a.rangeWinRate)
            .slice(0, 5);

        // Top 10 CupDiff
        const topCupDiff = [...activePlayers]
            .sort((a, b) => b.rangeCupDiff - a.rangeCupDiff)
            .slice(0, 10);

        // Top 5 Duration (Most games played/tracked for valid data)
        const topDuration = [...activePlayers]
            // Sort by who has the most history points in this range, then name
            .sort((a, b) => b.filteredHistory.length - a.filteredHistory.length || a.name.localeCompare(b.name))
            .slice(0, 5);

        return { topWinRate, topCupDiff, topDuration };
    }, [stats, range]);

    const NEON_COLORS = ['#d946ef', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b']; // Exact match from design system

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-8)' }}>
            {/* Controls */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-2)' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                    {[
                        { id: 'LAST_5', label: '5 Games' },
                        { id: 'MONTH', label: 'Monat' },
                        { id: 'YEAR', label: 'Jahr' },
                        { id: 'ALL', label: 'All Time' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setRange(opt.id as RangeType)}
                            style={{
                                border: '1px solid',
                                borderColor: range === opt.id ? 'var(--color-primary)' : 'transparent',
                                background: range === opt.id ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                                color: range === opt.id ? 'var(--color-primary)' : 'var(--color-text-dim)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

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
                                    formatter={(value: any) => [`${Number(value).toFixed(1)} min`, 'Dauer']}
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
