'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer, Hourglass, Coffee, Sigma, X } from 'lucide-react';
import type { PlayerPaceStats } from '@/lib/duration-utils';
import { formatDuration } from '@/lib/duration-utils';
import FormulaRow from '@/components/FormulaRow';

const paceIconMap: Record<string, React.ElementType> = {
    Blitzschnell: Zap,
    Schnellspieler: Timer,
    Normal: Hourglass,
    Genießer: Coffee,
};

const paceThresholds = [
    { label: 'Blitzschnell', condition: '< 70% des Durchschnitts', factor: 0.7, color: '#06b6d4' },
    { label: 'Schnellspieler', condition: '70–90% des Durchschnitts', factor: 0.9, color: '#22c55e' },
    { label: 'Normal', condition: '90–110% des Durchschnitts', factor: 1.1, color: 'var(--color-text-dim)' },
    { label: 'Genießer', condition: '> 110% des Durchschnitts', factor: null, color: '#f97316' },
];

interface Props {
    paceStats: PlayerPaceStats;
}

export default function PaceStatsWidget({ paceStats }: Props) {
    const [showFormula, setShowFormula] = useState(false);

    const PaceIcon = paceIconMap[paceStats.paceLabel] ?? Timer;
    const globalAvg = paceStats.globalAvgDuration ?? 720;
    const ratio = globalAvg > 0 ? (paceStats.averageDuration / globalAvg) : 1;
    const ratioPercent = Math.round(ratio * 100);

    const activeThreshold = paceThresholds.find(t => t.label === paceStats.paceLabel);

    return (
        <div style={{ marginTop: 'var(--spacing-6)', width: '100%' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <PaceIcon size={18} /> Spieltempo
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-4)' }}>
                {/* PaceLabel card — clickable */}
                <button
                    onClick={() => setShowFormula(v => !v)}
                    style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
                >
                    <div className="glass-panel" style={{
                        padding: 'var(--spacing-4)',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        background: showFormula
                            ? 'linear-gradient(135deg, rgba(190,35,213,0.10) 0%, rgba(147,51,234,0.05) 100%)'
                            : undefined,
                        border: showFormula ? '1px solid rgba(190,35,213,0.30)' : undefined,
                    }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: activeThreshold?.color ?? 'var(--color-primary)' }}>
                            {paceStats.paceLabel}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-1)' }}>
                            Spielstil
                        </div>
                        <div style={{
                            marginTop: '6px',
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            fontSize: '0.7rem', fontWeight: 600,
                            color: showFormula ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                            transition: 'color 0.2s',
                        }}>
                            <Sigma size={11} /> Formel
                        </div>
                    </div>
                </button>

                {/* Avg duration card */}
                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-secondary)' }}>
                        {formatDuration(paceStats.averageDuration)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-1)' }}>
                        Avg. Spielzeit
                    </div>
                </div>
            </div>

            {/* Fastest / Slowest */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
                <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4ECDC4' }}>
                        {formatDuration(paceStats.fastestMatch)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Schnellster</div>
                </div>
                <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FF6B6B' }}>
                        {formatDuration(paceStats.slowestMatch)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Längster</div>
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
                                        Spieltempo-Berechnung
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowFormula(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: '2px', display: 'flex' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {/* Step 1: avg duration */}
                                <FormulaRow
                                    label="Ø Spielzeit"
                                    formula={`Σ Matchdauern / ${paceStats.totalMatches} Spiele`}
                                    result={formatDuration(paceStats.averageDuration)}
                                />
                                {/* Step 2: global avg */}
                                <FormulaRow
                                    label="Globaler Ø"
                                    formula="Ø aller Spieler (nur Liga)"
                                    result={formatDuration(globalAvg)}
                                />
                                {/* Step 3: ratio */}
                                <FormulaRow
                                    label="Verhältnis"
                                    formula={`${formatDuration(paceStats.averageDuration)} / ${formatDuration(globalAvg)} × 100`}
                                    result={`${ratioPercent}%`}
                                />
                                {/* Step 4: classification */}
                                <div style={{
                                    marginTop: '8px',
                                    padding: '8px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(190,35,213,0.06)',
                                    borderTop: '1px solid rgba(190,35,213,0.15)',
                                }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                        Klassifizierung
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        {paceThresholds.map(t => (
                                            <div key={t.label} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '3px 6px',
                                                borderRadius: '4px',
                                                background: t.label === paceStats.paceLabel ? 'rgba(190,35,213,0.10)' : 'transparent',
                                                fontWeight: t.label === paceStats.paceLabel ? 700 : 400,
                                            }}>
                                                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>
                                                    {t.condition}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: t.label === paceStats.paceLabel ? (activeThreshold?.color ?? 'var(--color-primary)') : 'var(--color-text-subtle)' }}>
                                                    {t.label} {t.label === paceStats.paceLabel ? '← du' : ''}
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

