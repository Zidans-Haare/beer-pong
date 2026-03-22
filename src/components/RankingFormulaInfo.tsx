'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sigma, X, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function RankingFormulaInfo() {
    const t = useTranslations('stats');
    const [open, setOpen] = useState(false);

    return (
        <div>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: open ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                    background: open ? 'var(--color-primary-light)' : 'transparent',
                    border: `1px solid ${open ? 'rgba(190,35,213,0.25)' : 'var(--color-border)'}`,
                    transition: 'all 0.2s ease',
                }}
            >
                <Sigma size={12} />
                {t('howRanked')}
                <ChevronDown
                    size={12}
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key="ranking-formula"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: '12px' }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            padding: 'var(--spacing-4)',
                            background: 'linear-gradient(135deg, rgba(190,35,213,0.05) 0%, rgba(147,51,234,0.03) 100%)',
                            border: '1px solid rgba(190,35,213,0.15)',
                            borderRadius: 'var(--radius-lg)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Sigma size={15} color="var(--color-primary)" />
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>
                                        {t('rankingLogicTitle')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: '2px', display: 'flex' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Sorting cascade */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {t('sortingCascade')}
                                </div>
                                {[
                                    { rank: '1.', label: t('tournamentWins'), formula: 'COUNT(Tournament Rank 1)', note: t('mainCriteria') },
                                    { rank: '2.', label: t('matchWins'), formula: 'COUNT(winner = Player)', note: t('tiebreaker') },
                                    { rank: '3.', label: t('cupDifference'), formula: 'Σ cupsHit − Σ cupsReceived', note: t('lastTiebreaker') },
                                ].map(item => (
                                    <div key={item.rank} style={{
                                        padding: '6px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(190,35,213,0.04)',
                                        border: '1px solid rgba(190,35,213,0.08)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>{item.rank}</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>{item.label}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>{item.note}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-dim)', marginTop: '2px', wordBreak: 'break-word' }}>
                                            {item.formula}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Column formulas */}
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-2)' }}>
                                {t('columnFormulas')}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {[
                                    { col: 'WIN RATE', formula: 'Wins / Games × 100', note: t('rankedOnly') },
                                    { col: '+/−', formula: 'Σ cupsHit − Σ cupsReceived', note: t('allMatches') },
                                    { col: 'TROPHIES', formula: 'COUNT(Rank 1 in Tournaments)', note: t('rank1') },
                                ].map(item => (
                                    <div key={item.col} style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                                                {item.col}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>
                                                [{item.note}]
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-dim)', marginTop: '1px', wordBreak: 'break-word' }}>
                                            {item.formula}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Data source */}
                            <div style={{
                                marginTop: 'var(--spacing-3)',
                                padding: '6px 10px',
                                background: 'rgba(8,145,178,0.06)',
                                border: '1px solid rgba(8,145,178,0.15)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-dim)',
                                fontFamily: 'monospace',
                            }}>
                                {t('dataSource')}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
