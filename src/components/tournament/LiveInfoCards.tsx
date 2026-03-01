'use client';

import { format } from 'date-fns';
import { Clock, Target, Sigma, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration } from '@/lib/duration';
import FormulaRow from '@/components/FormulaRow';

interface Forecast {
    estimatedEndTime: Date;
    remainingMatches: number;
    avgMatchDuration?: number;    // seconds
    totalRemainingMinutes?: number;
}

interface WaitTime {
    startTime: Date;
    table: number;
    waitMin: number;
}

interface Props {
    forecast: Forecast | null;
    waitTime: WaitTime | null;
}

export default function LiveInfoCards({ forecast, waitTime }: Props) {
    const [showFormula, setShowFormula] = useState(false);

    if (!forecast && !waitTime) return null;

    const avgFormatted = forecast?.avgMatchDuration ? formatDuration(forecast.avgMatchDuration) : null;
    const totalRaw = forecast?.avgMatchDuration && forecast.remainingMatches
        ? Math.round(forecast.avgMatchDuration * forecast.remainingMatches)
        : null;
    const totalMin = totalRaw ? Math.round(totalRaw / 60) : null;
    const adjustedMin = totalMin ? Math.round(totalMin * 0.8) : null;

    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 'var(--spacing-3)'
            }}>
                {forecast && forecast.remainingMatches > 0 && (
                    <button
                        onClick={() => setShowFormula(v => !v)}
                        style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
                    >
                        <div style={{
                            padding: 'var(--spacing-4)',
                            background: showFormula
                                ? 'linear-gradient(135deg, rgba(190,35,213,0.10) 0%, rgba(147,51,234,0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(78, 205, 196, 0.02) 100%)',
                            border: showFormula ? '1px solid rgba(190,35,213,0.30)' : '1px solid rgba(78, 205, 196, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            transition: 'all 0.2s ease',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={14} color={showFormula ? 'var(--color-primary)' : 'var(--color-secondary)'} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Ende
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '3px',
                                    fontSize: '0.65rem', fontWeight: 600,
                                    color: showFormula ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                                    transition: 'color 0.2s',
                                }}>
                                    <Sigma size={10} /> Formel
                                </div>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                {format(forecast.estimatedEndTime, 'HH:mm')}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                {forecast.remainingMatches} {forecast.remainingMatches === 1 ? 'Spiel' : 'Spiele'} übrig
                            </div>
                        </div>
                    </button>
                )}

                {waitTime && (
                    <div style={{
                        padding: 'var(--spacing-4)',
                        background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.02) 100%)',
                        border: '1px solid rgba(255, 107, 107, 0.3)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
                            <Target size={14} color="var(--color-primary)" />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Dein Spiel
                            </span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            ~{format(waitTime.startTime, 'HH:mm')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                            Tisch {waitTime.table} • {waitTime.waitMin} Min.
                        </div>
                    </div>
                )}
            </div>

            {/* Forecast Formula Panel */}
            <AnimatePresence>
                {showFormula && forecast && (
                    <motion.div
                        key="forecast-formula"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 'var(--spacing-3)' }}
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
                                        Prognose-Berechnung
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
                                {/* Source explanation */}
                                <div style={{
                                    padding: '6px 8px', marginBottom: '4px',
                                    background: 'rgba(8,145,178,0.07)',
                                    border: '1px solid rgba(8,145,178,0.15)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.78rem',
                                    color: 'var(--color-text-dim)',
                                    fontFamily: 'monospace',
                                }}>
                                    Ø pro Spiel: historischer Matchup → Spieler-Ø → globaler Fallback
                                </div>

                                {avgFormatted && <FormulaRow label="Ø pro Spiel" formula="basierend auf Spielerhistorie" result={avgFormatted} />}
                                <FormulaRow label="Spiele übrig" formula="verbleibende Matches ohne Ergebnis" result={`${forecast.remainingMatches}`} />
                                {totalMin !== null && <FormulaRow label="Summe brutto" formula={`${avgFormatted} × ${forecast.remainingMatches} Spiele`} result={`${totalMin} Min`} />}
                                <FormulaRow label="Parallelfaktor" formula="× 0.8 (Matches überlappen sich)" result="80%" />
                                {adjustedMin !== null && (
                                    <FormulaRow label="Restzeit netto" formula={`${totalMin} Min × 0.8`} result={`${adjustedMin} Min`} highlight />
                                )}
                                <FormulaRow label="Ende" formula={`jetzt + ${adjustedMin ?? '?'} Min`} result={format(forecast.estimatedEndTime, 'HH:mm') + ' Uhr'} highlight />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

