'use client';

import { PlayerStats } from '@/lib/stats';
import { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'framer-motion';

export default function DashboardStatsWidget({ stats }: { stats: PlayerStats[] }) {
    const t = useTranslations('home');
    const reducedMotion = useReducedMotion();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Top 3 players by winrate
    const topPlayers = useMemo(() => {
        return [...stats].sort((a, b) => b.winRate - a.winRate).slice(0, 3);
    }, [stats]);

    const NEON_COLORS = ['var(--color-primary)', '#28647a', '#c34232'];

    return (
        <section className="performance-section">
            <div className="widget-header">
                <span className="widget-title">Performance</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700 }}>TOP 3</span>
            </div>

            {/* Chart */}
            <div style={{ height: '200px', width: '100%', marginTop: 'var(--spacing-4)' }}>
                {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={
                            (() => {
                                // Merge data by match index (Game 1, Game 2, etc.)
                                const maxMatches = Math.max(...topPlayers.map(p => p.history.length));
                                return Array.from({ length: maxMatches }).map((_, i) => ({
                                    game: i + 1,
                                    p1: topPlayers[0]?.history[i]?.winRate,
                                    p2: topPlayers[1]?.history[i]?.winRate,
                                    p3: topPlayers[2]?.history[i]?.winRate,
                                    name1: topPlayers[0]?.name,
                                    name2: topPlayers[1]?.name,
                                    name3: topPlayers[2]?.name,
                                }));
                            })()
                        }>
                            <defs>
                                <linearGradient id="colorP1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={NEON_COLORS[0]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={NEON_COLORS[0]} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorP2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={NEON_COLORS[1]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={NEON_COLORS[1]} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorP3" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={NEON_COLORS[2]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={NEON_COLORS[2]} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                            <XAxis dataKey="game" hide />
                            <Tooltip
                                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)' }}
                                itemStyle={{ fontSize: '0.8rem', fontWeight: 600 }}
                                formatter={(value: any, name: any, props: any) => {
                                    const pIndex = name === 'p1' ? 0 : name === 'p2' ? 1 : 2;
                                    const pName = props.payload[`name${pIndex + 1}`];
                                    return [`${value}%`, pName];
                                }}
                                labelFormatter={(label) => t('gameLabel', { n: Number(label) })}
                            />
                            {/* Player 1 Area */}
                            {topPlayers[0] && (
                                <Area
                                    isAnimationActive={!reducedMotion}
                                    animationDuration={300}
                                    type="monotone"
                                    dataKey="p1"
                                    name="p1"
                                    stroke={NEON_COLORS[0]}
                                    fillOpacity={1}
                                    fill="url(#colorP1)"
                                    strokeWidth={3}
                                    connectNulls
                                />
                            )}
                            {/* Player 2 Area */}
                            {topPlayers[1] && (
                                <Area
                                    isAnimationActive={!reducedMotion}
                                    animationDuration={300}
                                    type="monotone"
                                    dataKey="p2"
                                    name="p2"
                                    stroke={NEON_COLORS[1]}
                                    fillOpacity={0.6}
                                    fill="url(#colorP2)"
                                    strokeWidth={2}
                                    connectNulls
                                />
                            )}
                            {/* Player 3 Area */}
                            {topPlayers[2] && (
                                <Area
                                    isAnimationActive={!reducedMotion}
                                    animationDuration={300}
                                    type="monotone"
                                    dataKey="p3"
                                    name="p3"
                                    stroke={NEON_COLORS[2]}
                                    fillOpacity={0.4}
                                    fill="url(#colorP3)"
                                    strokeWidth={2}
                                    connectNulls
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="performance-ranking">
                {topPlayers.map((player, index) => <Link key={player.id} href={`/players/${player.id}`} className="performance-row">
                    <span className="score performance-rank" style={{ color: NEON_COLORS[index] }}>{String(index + 1).padStart(2, '0')}</span>
                    <span className="performance-name">{player.name}<span className="performance-track"><span style={{ width: `${player.winRate * 100}%`, background: NEON_COLORS[index] }} /></span></span>
                    <span className="score performance-value">{(player.winRate * 100).toFixed(0)}<small>%</small></span>
                </Link>)}
            </div>
        </section>
    );
}
