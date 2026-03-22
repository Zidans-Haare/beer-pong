'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Customized } from 'recharts';
import { Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

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

function findMaintenance(time: string, maintenanceList: Maintenance[]): Maintenance | null {
    const t = new Date(time).getTime();
    for (const m of maintenanceList) {
        const slots = m.timeslotList?.length
            ? m.timeslotList
            : (m.startDate && m.endDate ? [{ startDate: m.startDate, endDate: m.endDate }] : []);
        for (const slot of slots) {
            if (!slot.startDate || !slot.endDate) continue;
            if (t >= new Date(slot.startDate).getTime() && t <= new Date(slot.endDate).getTime()) return m;
        }
    }
    return null;
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

function CustomTooltip({ active, payload, maintenanceList }: any) {
    const t = useTranslations('stats');
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point?.isoTime) return null;

    const d = new Date(point.isoTime);
    const timeLabel = `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

    const maint = findMaintenance(point.isoTime, maintenanceList ?? []);
    const isMaint = point.status === 3 || !!maint;
    const isUp = point.status === 1;
    const isDown = !isUp && !isMaint;

    const maintLabel = maint
        ? [maint.title, maint.description].filter(Boolean).join(' – ')
        : (point.msg || null);

    return (
        <div style={{
            background: '#ffffff',
            border: `1px solid ${isDown ? COLOR_DOWN : isMaint ? COLOR_MAINTENANCE : 'rgba(0,0,0,0.1)'}`,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.8rem',
            maxWidth: '240px',
        }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#0f0f14' }}>
                {timeLabel}
            </div>
            {isUp && (
                <div style={{ color: '#52525b' }}>Ping: <strong>{point.ping} ms</strong></div>
            )}
            {isMaint && (
                <div style={{ color: COLOR_MAINTENANCE, fontWeight: 600 }}>
                    🔧 {t('maintenance')}{maintLabel ? `: ${maintLabel}` : ''}
                </div>
            )}
            {isDown && (
                <div style={{ color: COLOR_DOWN, fontWeight: 600 }}>
                    ⚠ {t('outage')}{point.msg ? `: ${point.msg}` : ''}
                </div>
            )}
        </div>
    );
}


// Draws colored background areas for outage/maintenance directly in SVG coordinate space
function StatusBackground(props: any) {
    const { data, xAxisMap, yAxisMap } = props;
    const xAxis = xAxisMap && (Object.values(xAxisMap)[0] as any);
    const yAxis = yAxisMap && (Object.values(yAxisMap)[0] as any);
    if (!xAxis?.scale || !yAxis) return null;
    const top = yAxis.y;
    const height = yAxis.height;
    const bw = xAxis.scale.bandwidth?.() ?? 8;
    return (
        <g>
            {(data as any[]).map((d: any, i: number) => {
                if (d.status === 1) return null;
                const x = xAxis.scale(d.time);
                if (x == null) return null;
                return (
                    <rect
                        key={i}
                        x={x - bw / 2}
                        y={top}
                        width={bw + 1}
                        height={height}
                        fill={d.status === 3 ? COLOR_MAINTENANCE : COLOR_DOWN}
                        fillOpacity={0.35}
                    />
                );
            })}
        </g>
    );
}

type Period = '3h' | '24h' | 'all';

export default function UptimeGraph({ heartbeats, uptime24h, maintenanceList = [] }: UptimeGraphProps) {
    const t = useTranslations('stats');
    const [mounted, setMounted] = useState(false);
    const [period, setPeriod] = useState<Period>('all');
    useEffect(() => { setMounted(true); }, []);

    const PERIODS: { label: string; value: Period; ms: number | null }[] = [
        { label: t('last3h'),  value: '3h',  ms: 3 * 60 * 60 * 1000 },
        { label: t('last24h'), value: '24h', ms: 24 * 60 * 60 * 1000 },
        { label: t('allTime'), value: 'all', ms: null },
    ];

    const filteredHeartbeats = period === 'all' ? heartbeats : (() => {
        const cutoff = Date.now() - (PERIODS.find(p => p.value === period)!.ms!);
        return heartbeats.filter(hb => new Date(hb.time).getTime() >= cutoff);
    })();

    const uptimePct = Math.round(uptime24h * 10000) / 100;
    const lastHb = heartbeats[heartbeats.length - 1];
    const isUp = lastHb?.status === 1;
    const isMaint = lastHb?.status === 3;

    const uptimeColor = uptimePct >= 99 ? '#22c55e' : uptimePct >= 95 ? '#f59e0b' : '#ef4444';

    const showDate = period === 'all' || period === '24h';
    const chartData = filteredHeartbeats.map((hb) => {
        const maint = hb.status !== 1 ? findMaintenance(hb.time, maintenanceList) : null;
        const effectiveStatus = maint && hb.status !== 1 ? 3 : hb.status;
        const d = new Date(hb.time);
        const label = showDate
            ? `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
            : `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        return {
            time: label,
            isoTime: hb.time,
            ping: hb.status === 1 ? hb.ping : 0,
            status: effectiveStatus,
            msg: hb.msg,
        };
    });

    const avgPing = filteredHeartbeats.filter(h => h.status === 1).reduce((sum, h, _, arr) => sum + h.ping / arr.length, 0);

    const timeRange = (() => {
        if (filteredHeartbeats.length < 2) return `${filteredHeartbeats.length} ${t('pings')}`;
        const diffMs = new Date(filteredHeartbeats[filteredHeartbeats.length - 1].time).getTime() - new Date(filteredHeartbeats[0].time).getTime();
        const diffMin = diffMs / 60000;
        if (diffMin < 120) return `~${Math.round(diffMin)} ${t('min')}`;
        if (diffMin < 1440) return `~${Math.round(diffMin / 60)} ${t('hours')}`;
        return `~${Math.round(diffMin / 1440)} ${t('days')}`;
    })();

    const currentStatusLabel = isMaint ? t('maintenance') : isUp ? t('online') : t('offline');
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
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t('serverUptime')}</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', margin: '2px 0 0 0' }}>
                            {process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : 'localhost'} · {timeRange}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Period Filter */}
                    <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: '99px', padding: '3px', gap: '2px' }}>
                        {PERIODS.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '99px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: period === p.value ? '#ffffff' : 'transparent',
                                    color: period === p.value ? '#0f0f14' : '#a1a1aa',
                                    boxShadow: period === p.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
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

            {/* Maintenance windows */}
            {maintenanceList.length > 0 && maintenanceList.map((m, i) => {
                const slot = m.timeslotList?.[0];
                const start = slot?.startDate ? new Date(slot.startDate) : null;
                const end = slot?.endDate ? new Date(slot.endDate) : null;
                const fmt = (d: Date) => d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
                                    {fmt(start)} – {fmt(end)}
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
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLOR_DOWN, display: 'inline-block' }} /> {t('outage')}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLOR_MAINTENANCE, display: 'inline-block' }} /> {t('maintenance')}
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
                            <Tooltip content={<CustomTooltip maintenanceList={maintenanceList} />} />
                            <Customized component={(props: any) => <StatusBackground {...props} data={chartData} />} />
                            <ReferenceLine y={Math.round(avgPing)} stroke="#a1a1aa" strokeDasharray="3 3" />
                            <Area
                                type="monotone"
                                dataKey="ping"
                                stroke={COLOR_UP}
                                strokeWidth={2}
                                fill="url(#pingGradient)"
                                dot={false}
                                connectNulls={true}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
