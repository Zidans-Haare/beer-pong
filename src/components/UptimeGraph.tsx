'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

const COLOR_UP = '#06b6d4';
const COLOR_DOWN = '#ef4444';
const COLOR_MAINTENANCE = '#f59e0b';

interface Heartbeat {
    status: number;
    time: string;
    msg: string;
    ping: number;
}

interface Maintenance {
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    timeslotList?: { startDate: string; endDate: string }[];
}

interface UptimeGraphProps {
    heartbeats: Heartbeat[];
    uptime24h: number;
    maintenanceList?: Maintenance[];
}

// status: 0=Down, 1=Up, 2=Pending, 3=Maintenance
function statusColor(status: number) {
    if (status === 3) return COLOR_MAINTENANCE;
    if (status !== 1) return COLOR_DOWN;
    return COLOR_UP;
}

function CustomTooltip({ active, payload, label, heartbeats }: any) {
    if (!active || !payload?.length) return null;
    const idx = heartbeats.findIndex((h: Heartbeat) => h.time.slice(11, 16) === label);
    const hb: Heartbeat | undefined = heartbeats[idx];
    if (!hb) return null;

    const isUp = hb.status === 1;
    const isMaint = hb.status === 3;
    const isDown = hb.status === 0;

    return (
        <div style={{
            background: '#ffffff',
            border: `1px solid ${isDown ? COLOR_DOWN : isMaint ? COLOR_MAINTENANCE : 'rgba(0,0,0,0.1)'}`,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.8rem',
            maxWidth: '220px',
        }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#0f0f14' }}>
                {hb.time.slice(11, 16)} Uhr
            </div>
            {isUp && (
                <div style={{ color: '#52525b' }}>Ping: <strong>{hb.ping} ms</strong></div>
            )}
            {isMaint && (
                <div style={{ color: COLOR_MAINTENANCE, fontWeight: 600 }}>
                    🔧 Wartung{hb.msg ? `: ${hb.msg}` : ''}
                </div>
            )}
            {isDown && (
                <div style={{ color: COLOR_DOWN, fontWeight: 600 }}>
                    ⚠ Ausfall{hb.msg ? `: ${hb.msg}` : ''}
                </div>
            )}
        </div>
    );
}

function CustomDot(props: any) {
    const { cx, cy, payload } = props;
    if (payload.status === 1) return null; // Keine Dots für normale Pings
    const color = statusColor(payload.status);
    return (
        <circle
            cx={cx}
            cy={cy ?? 10}
            r={5}
            fill={color}
            stroke="#ffffff"
            strokeWidth={2}
        />
    );
}

export default function UptimeGraph({ heartbeats, uptime24h, maintenanceList = [] }: UptimeGraphProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const uptimePct = Math.round(uptime24h * 10000) / 100;
    const lastHb = heartbeats[heartbeats.length - 1];
    const isUp = lastHb?.status === 1;
    const isMaint = lastHb?.status === 3;

    const uptimeColor = uptimePct >= 99 ? '#22c55e' : uptimePct >= 95 ? '#f59e0b' : '#ef4444';

    const chartData = heartbeats.map((hb) => ({
        time: hb.time.slice(11, 16),
        ping: hb.status === 1 ? hb.ping : hb.status === 3 ? 0 : 0,
        status: hb.status,
    }));

    const avgPing = heartbeats.filter(h => h.status === 1).reduce((sum, h, _, arr) => sum + h.ping / arr.length, 0);

    const timeRange = (() => {
        if (heartbeats.length < 2) return `${heartbeats.length} Pings`;
        const diffMs = new Date(heartbeats[heartbeats.length - 1].time).getTime() - new Date(heartbeats[0].time).getTime();
        const diffMin = diffMs / 60000;
        if (diffMin < 120) return `letzte ~${Math.round(diffMin)} Min.`;
        if (diffMin < 1440) return `letzte ~${Math.round(diffMin / 60)} Std.`;
        return `letzte ~${Math.round(diffMin / 1440)} Tage`;
    })();

    const currentStatusLabel = isMaint ? 'Wartung' : isUp ? 'Online' : 'Offline';
    const currentStatusColor = isMaint ? COLOR_MAINTENANCE : isUp ? '#22c55e' : COLOR_DOWN;

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
                    <Activity size={20} color={COLOR_UP} />
                    <div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Server-Uptime</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', margin: '2px 0 0 0' }}>
                            bier.olomek.com · {timeRange}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '99px',
                        background: `${currentStatusColor}18`,
                        border: `1px solid ${currentStatusColor}55`,
                        color: currentStatusColor,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                    }}>
                        <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: currentStatusColor,
                            animation: isUp ? 'pulse 2s infinite' : 'none'
                        }} />
                        {currentStatusLabel}
                    </span>
                </div>
            </div>

            {/* Geplante Wartungen */}
            {maintenanceList.length > 0 && maintenanceList.map((m, i) => {
                const slot = m.timeslotList?.[0];
                const start = slot?.startDate ? new Date(slot.startDate) : null;
                const end = slot?.endDate ? new Date(slot.endDate) : null;
                const fmt = (d: Date) => d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                return (
                    <div key={i} style={{
                        margin: 'var(--spacing-4) var(--spacing-6) 0',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.35)',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        fontSize: '0.85rem',
                    }}>
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔧</span>
                        <div>
                            <div style={{ fontWeight: 700, color: COLOR_MAINTENANCE }}>{m.title}</div>
                            {m.description && <div style={{ color: '#52525b', marginTop: '2px' }}>{m.description}</div>}
                            {start && end && (
                                <div style={{ color: '#a1a1aa', marginTop: '4px', fontSize: '0.78rem' }}>
                                    {fmt(start)} – {fmt(end)} Uhr
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Chart */}
            <div style={{ padding: 'var(--spacing-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: '#a1a1aa' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLOR_DOWN, display: 'inline-block' }} /> Ausfall
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLOR_MAINTENANCE, display: 'inline-block' }} /> Wartung
                        </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Ø {Math.round(avgPing)} ms</span>
                </div>
                {mounted && (
                    <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="pingGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLOR_UP} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={COLOR_UP} stopOpacity={0.02} />
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
                            <Tooltip content={<CustomTooltip heartbeats={heartbeats} />} />
                            <ReferenceLine y={Math.round(avgPing)} stroke="#a1a1aa" strokeDasharray="3 3" />
                            <Area
                                type="monotone"
                                dataKey="ping"
                                stroke={COLOR_UP}
                                strokeWidth={2}
                                fill="url(#pingGradient)"
                                dot={<CustomDot />}
                                connectNulls={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
