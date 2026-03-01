'use client';

import { calculateTournamentDuration, formatDuration, getEstimatedEndTime } from '@/lib/estimation';
import { Clock, Hourglass, Sigma, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    type: string;
    playerCount: number;
    matchDurationMin?: number;
    tableCount?: number;
    hasReturnLeg?: boolean;
    startTime?: Date;
}

type FormulaStep = { label: string; formula: string; result: string; highlight?: boolean };

function buildFormulaSteps(
    type: string,
    N: number,
    T: number,
    m: number,
    hasReturnLeg: boolean
): { title: string; params: string; steps: FormulaStep[] } {
    const mEff = m * (hasReturnLeg ? 2 : 1);

    if (type === 'SINGLE_ELIMINATION' || type === 'ELIMINATION') {
        const steps: FormulaStep[] = [];
        let currentPlayers = N;
        let total = 0;
        let round = 1;
        while (currentPlayers > 1) {
            const matches = Math.floor(currentPlayers / 2);
            const slots = Math.ceil(matches / T);
            const dur = slots * mEff;
            total += dur;
            steps.push({
                label: `Runde ${round}`,
                formula: `⌈${matches} Spiele / ${T} ${T === 1 ? 'Tisch' : 'Tische'}⌉ × ${mEff} Min`,
                result: `${dur} Min`,
            });
            currentPlayers = Math.ceil(currentPlayers / 2);
            round++;
        }
        steps.push({ label: 'Gesamt', formula: '', result: `${total} Min`, highlight: true });
        return {
            title: 'K.O.-Simulation',
            params: `N=${N} Spieler · ${T} ${T === 1 ? 'Tisch' : 'Tische'} · ${mEff} Min/Spiel`,
            steps,
        };
    }

    if (type === 'ROUND_ROBIN') {
        let totalMatches = (N * (N - 1)) / 2;
        if (hasReturnLeg) totalMatches *= 2;
        const maxParallel = Math.min(T, Math.floor(N / 2));
        const rounds = Math.ceil(totalMatches / maxParallel);
        const total = rounds * m;
        return {
            title: 'Jeder-gegen-Jeden',
            params: `N=${N} Spieler · ${T} ${T === 1 ? 'Tisch' : 'Tische'} · ${m} Min/Spiel`,
            steps: [
                { label: 'Spiele gesamt', formula: `N×(N−1)/2${hasReturnLeg ? '×2' : ''} = ${N}×${N - 1}/2${hasReturnLeg ? '×2' : ''}`, result: `${totalMatches}` },
                { label: 'Max. parallel', formula: `min(Tische, ⌊N/2⌋) = min(${T}, ${Math.floor(N / 2)})`, result: `${maxParallel}` },
                { label: 'Parallele Runden', formula: `⌈${totalMatches} / ${maxParallel}⌉`, result: `${rounds}` },
                { label: 'Gesamt', formula: `${rounds} Runden × ${m} Min`, result: `${total} Min`, highlight: true },
            ],
        };
    }

    if (type === 'GROUPS' || type === 'GROUP_AND_KNOCKOUT') {
        const p1 = Math.floor(N / 2);
        const p2 = N - p1;
        let groupMatches = (p1 * (p1 - 1)) / 2 + (p2 * (p2 - 1)) / 2;
        if (hasReturnLeg) groupMatches *= 2;
        const groupDur = Math.ceil(groupMatches / T) * m;
        const koDur = 2 * m;
        const total = groupDur + koDur;
        return {
            title: 'Gruppen + K.O.',
            params: `N=${N} Spieler · ${T} ${T === 1 ? 'Tisch' : 'Tische'} · ${m} Min/Spiel`,
            steps: [
                { label: 'Gruppe A', formula: `${p1}×(${p1}−1)/2${hasReturnLeg ? '×2' : ''}`, result: `${(p1 * (p1 - 1)) / 2 * (hasReturnLeg ? 2 : 1)} Spiele` },
                { label: 'Gruppe B', formula: `${p2}×(${p2}−1)/2${hasReturnLeg ? '×2' : ''}`, result: `${(p2 * (p2 - 1)) / 2 * (hasReturnLeg ? 2 : 1)} Spiele` },
                { label: 'Gruppenphase', formula: `⌈${groupMatches} Spiele / ${T} ${T === 1 ? 'Tisch' : 'Tische'}⌉ × ${m} Min`, result: `${groupDur} Min` },
                { label: 'K.O.-Phase', formula: `2 Runden × ${m} Min`, result: `${koDur} Min` },
                { label: 'Gesamt', formula: `${groupDur} + ${koDur}`, result: `${total} Min`, highlight: true },
            ],
        };
    }

    // Fallback
    const total = Math.ceil(N / T) * m;
    return {
        title: 'Schätzung',
        params: `N=${N} · T=${T} · ${m} Min/Spiel`,
        steps: [
            { label: 'Gesamt', formula: `⌈${N} / ${T}⌉ × ${m} Min`, result: `${total} Min`, highlight: true },
        ],
    };
}

export default function LobbyDurationWidget({ type, playerCount, matchDurationMin = 12, tableCount = 1, hasReturnLeg = false, startTime }: Props) {
    const [showFormula, setShowFormula] = useState(false);

    const duration = useMemo(() => calculateTournamentDuration(type, playerCount, tableCount, matchDurationMin, hasReturnLeg), [type, playerCount, tableCount, matchDurationMin, hasReturnLeg]);
    const endTime = useMemo(() => getEstimatedEndTime(duration, startTime), [duration, startTime]);
    const formula = useMemo(() => buildFormulaSteps(type, playerCount, tableCount, matchDurationMin, hasReturnLeg), [type, playerCount, tableCount, matchDurationMin, hasReturnLeg]);

    const isFutureStart = startTime && startTime.getTime() > Date.now();

    if (playerCount < 2) return null;

    return (
        <div style={{ marginBottom: 'var(--spacing-6)' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-3)',
            }}>
                {/* Prognostizierte Dauer — clickable */}
                <button
                    onClick={() => setShowFormula(v => !v)}
                    style={{
                        all: 'unset',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                    }}
                >
                    <div className="glass-panel" style={{
                        padding: 'var(--spacing-4)',
                        background: showFormula
                            ? 'linear-gradient(135deg, rgba(190,35,213,0.12) 0%, rgba(147,51,234,0.06) 100%)'
                            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)',
                        border: showFormula ? '1px solid rgba(190,35,213,0.35)' : '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'flex', flexDirection: 'column', gap: '4px',
                        transition: 'all 0.2s ease',
                        height: '100%',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: showFormula ? 'var(--color-primary)' : 'var(--color-primary)' }}>
                                <Hourglass size={16} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prognostizierte Dauer</span>
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.7rem', fontWeight: 600,
                                color: showFormula ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                                transition: 'color 0.2s',
                            }}>
                                <Sigma size={12} />
                                Formel
                            </div>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {formatDuration(duration)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            bei {playerCount} Teilnehmern
                        </div>
                    </div>
                </button>

                {/* Voraussichtliches Ende */}
                <div className="glass-panel" style={{
                    padding: 'var(--spacing-4)',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-secondary)' }}>
                        <Clock size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Voraussichtliches Ende</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {endTime} Uhr
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        {isFutureStart ? 'wenn es pünktlich losgeht' : 'wenn es jetzt losgeht'}
                    </div>
                </div>
            </div>

            {/* Formula Panel */}
            <AnimatePresence>
                {showFormula && (
                    <motion.div
                        key="formula"
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
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-3)' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sigma size={15} color="var(--color-primary)" />
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>
                                            {formula.title}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-word' }}>
                                        {formula.params}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowFormula(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: '2px', display: 'flex', flexShrink: 0 }}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Steps */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {formula.steps.map((step, i) => (
                                    <div key={i} style={{
                                        padding: '5px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: step.highlight ? 'rgba(190,35,213,0.08)' : 'transparent',
                                        borderTop: step.highlight ? '1px solid rgba(190,35,213,0.15)' : 'none',
                                        marginTop: step.highlight ? '4px' : '0',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: step.highlight ? 700 : 500,
                                                color: step.highlight ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em',
                                                flexShrink: 0,
                                            }}>
                                                {step.label}
                                            </span>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                color: step.highlight ? 'var(--color-primary)' : 'var(--color-text)',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                = {step.result}
                                            </span>
                                        </div>
                                        {step.formula && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontFamily: 'monospace',
                                                color: 'var(--color-text-dim)',
                                                marginTop: '2px',
                                                wordBreak: 'break-word',
                                            }}>
                                                {step.formula}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
