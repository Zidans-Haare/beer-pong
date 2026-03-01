'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sigma, X, ChevronDown } from 'lucide-react';

export default function RankingFormulaInfo() {
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
                Wie wird gerankt?
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
                                        Ewige Tabelle — Ranking-Logik
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
                                    Sortierung (Tiebreaker-Kaskade)
                                </div>
                                {[
                                    { rank: '1.', label: 'Turniersiege', formula: 'COUNT(Turnier-Platz-1)', note: 'Hauptkriterium' },
                                    { rank: '2.', label: 'Match-Siege', formula: 'COUNT(winner = Spieler)', note: 'Bei Gleichstand' },
                                    { rank: '3.', label: 'Becherdifferenz', formula: 'Σ cupsHit − Σ cupsReceived', note: 'Letzter Tiebreaker' },
                                ].map(item => (
                                    <div key={item.rank} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '20px 110px 1fr auto',
                                        gap: '8px',
                                        alignItems: 'center',
                                        padding: '6px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(190,35,213,0.04)',
                                        border: '1px solid rgba(190,35,213,0.08)',
                                    }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{item.rank}</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>{item.label}</span>
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>{item.formula}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>{item.note}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Column formulas */}
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--spacing-2)' }}>
                                Spalten-Formeln
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {[
                                    { col: 'WIN RATE', formula: 'Siege / Spiele × 100', unit: '%', note: 'nur Liga' },
                                    { col: '+/−', formula: 'Σ cupsHit − Σ cupsReceived', unit: 'Becher', note: 'alle Matches' },
                                    { col: 'POKALE', formula: 'COUNT(Platz 1 in Turnieren)', unit: 'Stück', note: 'Rang 1' },
                                ].map(item => (
                                    <div key={item.col} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '72px 1fr auto',
                                        gap: '8px',
                                        alignItems: 'center',
                                        padding: '4px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                    }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            {item.col}
                                        </span>
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>
                                            {item.formula}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>
                                            [{item.note}]
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Datengrundlage */}
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
                                Datengrundlage: nur Ranked-Turniere (isRanked = true) · Gast-Matches ausgeschlossen
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
