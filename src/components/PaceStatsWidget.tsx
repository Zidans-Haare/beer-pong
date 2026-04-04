'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer, Hourglass, Coffee, Sigma, X } from 'lucide-react';
import type { PlayerPaceStats } from '@/lib/duration-utils';
import { formatDuration } from '@/lib/duration-utils';
import FormulaRow from '@/components/FormulaRow';
import { useTranslations } from 'next-intl';

type PaceKey = 'Blitzschnell' | 'Schnellspieler' | 'Normal' | 'Genießer' | 'Unbekannt';

const paceIconMap: Record<PaceKey, React.ElementType> = {
    Blitzschnell: Zap,
    Schnellspieler: Timer,
    Normal: Hourglass,
    Genießer: Coffee,
    Unbekannt: Timer,
};

const paceColors: Record<PaceKey, string> = {
    Blitzschnell: '#06b6d4',
    Schnellspieler: '#22c55e',
    Normal: 'var(--color-text-dim)',
    Genießer: '#f97316',
    Unbekannt: 'var(--color-text-dim)',
};

const paceOrder: PaceKey[] = ['Blitzschnell', 'Schnellspieler', 'Normal', 'Genießer'];

interface Props {
    paceStats: PlayerPaceStats;
}

export default function PaceStatsWidget({ paceStats }: Props) {
    const t = useTranslations('paceStats');
    const [showFormula, setShowFormula] = useState(false);

    const paceKey = paceStats.paceLabel as PaceKey;
    const PaceIcon = paceIconMap[paceKey] ?? Timer;
    const paceColor = paceColors[paceKey] ?? 'var(--color-primary)';
    const globalAvg = paceStats.globalAvgDuration ?? 720;
    const ratio = globalAvg > 0 ? (paceStats.averageDuration / globalAvg) : 1;
    const ratioPercent = Math.round(ratio * 100);

    return (
        <div style={{ marginTop: 'var(--spacing-6)', width: '100%' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <PaceIcon size={18} /> {t('title')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-4)' }}>
                {/* PaceLabel card — clickable */}
                <button onClick={() => setShowFormula(v => !v)} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
                    <div className="glass-panel" style={{
                        padding: 'var(--spacing-4)',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        background: showFormula ? 'linear-gradient(135deg, rgba(190,35,213,0.10) 0%, rgba(147,51,234,0.05) 100%)' : undefined,
                        border: showFormula ? '1px solid rgba(190,35,213,0.30)' : undefined,
                    }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: paceColor }}>
                            {t(`labels.${paceKey}`)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-1)' }}>
                            {t('playStyle')}
                        </div>
                        <div style={{
                            marginTop: '6px',
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            fontSize: '0.7rem', fontWeight: 600,
                            color: showFormula ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                            transition: 'color 0.2s',
                        }}>
                            <Sigma size={11} /> {t('formula')}
                        </div>
                    </div>
                </button>

                {/* Avg duration card */}
                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-secondary)' }}>
                        {formatDuration(paceStats.averageDuration)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-1)' }}>
                        {t('avgMatchTime')}
                    </div>
                </div>
            </div>

            {/* Fastest / Slowest */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
                <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4ECDC4' }}>
                        {formatDuration(paceStats.fastestMatch)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{t('fastest')}</div>
                </div>
                <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FF6B6B' }}>
                        {formatDuration(paceStats.slowestMatch)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{t('slowest')}</div>
                </div>
            </div>

            {/* Formula Panel */}
            <AnimatePresence>
                {showFormula && (
                    <motion.div
                        key="pace-formula"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 'var(--spacing-3)' }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="glass-panel" style={{
                            padding: 'var(--spacing-4)',
                            background: 'linear-gradient(135deg, rgba(190,35,213,0.05) 0%, rgba(147,51,234,0.03) 100%)',
                            border: '1px solid rgba(190,35,213,0.15)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Sigma size={15} color="var(--color-primary)" />
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>
                                        {t('formulaTitle')}
                                    </span>
                                </div>
                                <button onClick={() => setShowFormula(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: '2px', display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <FormulaRow
                                    label={t('avgLabel')}
                                    formula={t('avgFormula', { count: paceStats.totalMatches })}
                                    result={formatDuration(paceStats.averageDuration)}
                                />
                                <FormulaRow
                                    label={t('globalAvg')}
                                    formula={t('globalAvgFormula')}
                                    result={formatDuration(globalAvg)}
                                />
                                <FormulaRow
                                    label={t('ratio')}
                                    formula={`${formatDuration(paceStats.averageDuration)} / ${formatDuration(globalAvg)} × 100`}
                                    result={`${ratioPercent}%`}
                                />
                                <div style={{
                                    marginTop: '8px',
                                    padding: '8px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(190,35,213,0.06)',
                                    borderTop: '1px solid rgba(190,35,213,0.15)',
                                }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                        {t('classification')}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        {paceOrder.map(key => (
                                            <div key={key} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '3px 6px',
                                                borderRadius: '4px',
                                                background: key === paceKey ? 'rgba(190,35,213,0.10)' : 'transparent',
                                                fontWeight: key === paceKey ? 700 : 400,
                                            }}>
                                                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>
                                                    {t(`conditions.${key}`)}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: key === paceKey ? (paceColors[key] ?? 'var(--color-primary)') : 'var(--color-text-subtle)' }}>
                                                    {t(`labels.${key}`)} {key === paceKey ? t('youAreHere') : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
