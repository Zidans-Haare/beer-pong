'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

const COLOR_SECONDARY = '#06b6d4';

interface Heartbeat {
    status: number;
    time: string;
    msg: string;
    ping: number;
}

interface UptimeGraphProps {
    heartbeats: Heartbeat[];
    uptime24h: number;
}

export default function UptimeGraph({ heartbeats, uptime24h }: UptimeGraphProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const uptimePct = Math.round(uptime24h * 10000) / 100;
    const isUp = heartbeats.length > 0 && heartbeats[heartbeats.length - 1].status === 1;

    const uptimeColor = uptimePct >= 99 ? '#22c55e' : uptimePct >= 95 ? '#f59e0b' : '#ef4444';

    const chartData = heartbeats.map((hb) => ({
        time: hb.time.slice(11, 16), // HH:MM
        ping: hb.status === 1 ? hb.ping : null,
        status: hb.status,
    }));

    const avgPing = heartbeats.filter(h => h.ping != null && h.status === 1).reduce((sum, h, _, arr) => sum + h.ping / arr.length, 0);

    return (
        <div>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-6)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={20} color="var(--color-secondary)" />
                    <div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Server-Uptime</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', margin: '2px 0 0 0' }}>
                            bier.olomek.com · letzte 50 Pings
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Uptime Badge */}
                    <span style={{
                        padding: '4px 12px',
                        borderRadius: '99px',
                        background: `${uptimeColor}18`,
                        border: `1px solid ${uptimeColor}55`,
                        color: uptimeColor,
                        fontSize: '0.85rem',
                        fontWeight: 700,
                    }}>
                        {uptimePct}% uptime
                    </span>
                    {/* Status Dot */}
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '99px',
                        background: isUp ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${isUp ? '#22c55e55' : '#ef444455'}`,
                        color: isUp ? '#22c55e' : '#ef4444',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                    }}>
                        <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: isUp ? '#22c55e' : '#ef4444',
                            animation: isUp ? 'pulse 2s infinite' : 'none'
                        }} />
                        {isUp ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div style={{ padding: 'var(--spacing-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                        Ø {Math.round(avgPing)} ms
                    </span>
                </div>
                {mounted && (
                    <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="pingGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLOR_SECONDARY} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={COLOR_SECONDARY} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                                interval="preserveStartEnd"
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                                tickLine={false}
                                axisLine={false}
                                unit="ms"
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#ffffff',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                }}
                                formatter={(value: number | undefined) => [value != null ? `${value} ms` : '-', 'Ping']}
                                labelFormatter={(label) => `Zeit: ${label}`}
                            />
                            <ReferenceLine y={Math.round(avgPing)} stroke="#a1a1aa" strokeDasharray="3 3" />
                            <Area
                                type="monotone"
                                dataKey="ping"
                                stroke={COLOR_SECONDARY}
                                strokeWidth={2}
                                fill="url(#pingGradient)"
                                dot={false}
                                connectNulls={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
