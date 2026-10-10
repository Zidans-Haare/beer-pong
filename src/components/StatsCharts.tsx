'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'framer-motion';

export interface TrendSeries {
    id: string;
    name: string;
    history: { timestamp: number; winRate: number }[];
}

const COLORS = ['var(--color-primary)', '#c34232', '#28647a', '#94600b', '#7c3aed'];
const MAX_SELECTED = COLORS.length;

// Siegquote im Verlauf: ein Punkt je Turnier, Spieler per Chip wählbar
export default function StatsCharts({ series, defaultIds }: { series: TrendSeries[]; defaultIds: string[] }) {
    const t = useTranslations('stats');
    const reducedMotion = useReducedMotion();
    const [mounted, setMounted] = useState(false);
    const [selected, setSelected] = useState<string[]>(defaultIds.filter(id => series.some(s => s.id === id)).slice(0, MAX_SELECTED));

    useEffect(() => { setMounted(true); }, []);

    const toggle = (id: string) => setSelected(prev =>
        prev.includes(id) ? prev.filter(p => p !== id) : prev.length >= MAX_SELECTED ? prev : [...prev, id]);

    if (series.length === 0) return <p style={{ color: 'var(--color-text-dim)', margin: 0 }}>{t('noData')}</p>;

    return (
        <div>
            <div className="chart-chips" role="group" aria-label={t('chartPlayers')}>
                {series.map(s => {
                    const index = selected.indexOf(s.id);
                    const active = index >= 0;
                    return (
                        <button key={s.id} type="button" className={`chart-chip${active ? ' is-active' : ''}`} aria-pressed={active}
                            disabled={!active && selected.length >= MAX_SELECTED} onClick={() => toggle(s.id)}
                            style={active ? { borderColor: COLORS[index], color: COLORS[index] } : undefined}>
                            <span className="chart-chip-dot" style={{ background: active ? COLORS[index] : 'var(--color-border-strong)' }} />
                            {s.name}
                        </button>
                    );
                })}
            </div>
            <div style={{ height: '280px' }}>
                {mounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <LineChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                stroke="var(--color-text-dim)"
                                tick={{ fontSize: 12 }}
                                tickCount={6}
                            />
                            <YAxis stroke="var(--color-text-dim)" unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} width={44} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)', boxShadow: 'var(--shadow-lg)' }}
                                labelFormatter={(label) => typeof label === 'number' || typeof label === 'string' ? new Date(label).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                formatter={(value, name) => [`${value}%`, String(name ?? '')]}
                            />
                            {selected.map((id, i) => {
                                const s = series.find(x => x.id === id);
                                if (!s) return null;
                                return (
                                    <Line key={s.id} isAnimationActive={!reducedMotion} animationDuration={300}
                                        data={s.history} dataKey="winRate" name={s.name} type="linear"
                                        stroke={COLORS[i]} strokeWidth={2}
                                        dot={{ r: 4, fill: COLORS[i], strokeWidth: 0 }}
                                        activeDot={{ r: 7, fill: 'white', stroke: COLORS[i], strokeWidth: 2 }} />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
