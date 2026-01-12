'use client';

import { PlayerStats } from '@/lib/stats';
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function DashboardStatsWidget({ stats }: { stats: PlayerStats[] }) {
    // Top 3 players by winrate
    const topPlayers = useMemo(() => {
        return stats.sort((a, b) => b.winRate - a.winRate).slice(0, 3);
    }, [stats]);

    const NEON_COLORS = ['#d946ef', '#06b6d4', '#8b5cf6']; // Fuchsia, Cyan, Violet

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', gridRow: 'span 2' }}>
            <div className="widget-header">
                <span className="widget-title">Performance</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700 }}>TOP 3</span>
            </div>

            <div style={{ height: '200px', width: '100%', marginTop: 'var(--spacing-4)' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={topPlayers.length > 0 ? topPlayers[0].history : []}>
                        <defs>
                            <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <Tooltip
                            contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ color: 'white' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="winRate"
                            stroke="var(--color-primary)"
                            fillOpacity={1}
                            fill="url(#colorWinRate)"
                            strokeWidth={3}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-4)' }}>
                {topPlayers.map((player, i) => (
                    <div key={player.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: NEON_COLORS[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'white' }}>
                                {i + 1}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{player.name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: NEON_COLORS[i] }}>
                                {(player.winRate * 100).toFixed(0)}%
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>Win Rate</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
