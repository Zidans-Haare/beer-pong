'use client';

import { PlayerStats } from '@/lib/stats';
import { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Trophy } from 'lucide-react';

export default function DashboardStatsWidget({ stats }: { stats: PlayerStats[] }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
                                labelFormatter={(label) => `Spiel ${label}`}
                            />
                            {/* Player 1 Area */}
                            {topPlayers[0] && (
                                <Area
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

            {/* Podium View */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                gap: 'var(--spacing-3)',
                marginTop: 'var(--spacing-6)',
                height: '180px',
                paddingBottom: '10px' // Space for names
            }}>
                {/* 2nd Place */}
                {topPlayers[1] && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: NEON_COLORS[1], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', marginBottom: '8px', boxShadow: `0 0 15px ${NEON_COLORS[1]}80` }}>
                            2
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {topPlayers[1].name}
                        </div>
                        <div style={{
                            width: '100%',
                            height: '80px',
                            background: `linear-gradient(to top, ${NEON_COLORS[1]}20, ${NEON_COLORS[1]}80)`,
                            borderRadius: '8px 8px 0 0',
                            border: `1px solid ${NEON_COLORS[1]}`,
                            borderBottom: 'none',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            paddingTop: '8px',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                        }}>
                            {(topPlayers[1].winRate * 100).toFixed(0)}%
                        </div>
                    </div>
                )}

                {/* 1st Place */}
                {topPlayers[0] && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', zIndex: 2 }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: NEON_COLORS[0], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'white', marginBottom: '8px', boxShadow: `0 0 20px ${NEON_COLORS[0]}90` }}>
                            <Trophy size={24} />
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', marginBottom: '4px', color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {topPlayers[0].name}
                        </div>
                        <div style={{
                            width: '100%',
                            height: '110px',
                            background: `linear-gradient(to top, ${NEON_COLORS[0]}20, ${NEON_COLORS[0]}80)`,
                            borderRadius: '12px 12px 0 0',
                            border: `1px solid ${NEON_COLORS[0]}`,
                            borderBottom: 'none',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            paddingTop: '12px',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            boxShadow: `0 0 30px ${NEON_COLORS[0]}30`
                        }}>
                            {(topPlayers[0].winRate * 100).toFixed(0)}%
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {topPlayers[2] && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: NEON_COLORS[2], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', marginBottom: '8px', boxShadow: `0 0 15px ${NEON_COLORS[2]}80` }}>
                            3
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {topPlayers[2].name}
                        </div>
                        <div style={{
                            width: '100%',
                            height: '60px',
                            background: `linear-gradient(to top, ${NEON_COLORS[2]}20, ${NEON_COLORS[2]}80)`,
                            borderRadius: '8px 8px 0 0',
                            border: `1px solid ${NEON_COLORS[2]}`,
                            borderBottom: 'none',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            paddingTop: '8px',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                        }}>
                            {(topPlayers[2].winRate * 100).toFixed(0)}%
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
