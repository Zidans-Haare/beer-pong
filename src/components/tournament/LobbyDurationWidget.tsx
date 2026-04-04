'use client';

import { calculateTournamentDuration, formatDuration, getEstimatedEndTime } from '@/lib/estimation';
import { Clock, Hourglass, Sigma, X } from 'lucide-react';
import FormulaRow from '@/components/FormulaRow';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface Props {
    type: string;
    playerCount: number;
    matchDurationMin?: number;
    tableCount?: number;
    hasReturnLeg?: boolean;
    startTime?: Date;
}

type FormulaStep = { label: string; formula: string; result: string; highlight?: boolean };
type FormulaData = { title: string; params: string; steps: FormulaStep[] };

type Tr = {
    table: string; tables: string; players: string; total: string;
    round: (n: number) => string;
    titles: { elimination: string; roundRobin: string; groups: string; estimate: string };
    labels: { totalMatches: string; maxParallel: string; parallelRounds: string; groupA: string; groupB: string; groupStage: string; koPhase: string };
};

function buildFormulaSteps(type: string, N: number, T: number, m: number, hasReturnLeg: boolean, tr: Tr): FormulaData {
    const mEff = m * (hasReturnLeg ? 2 : 1);
    const tLabel = (n: number) => `${n} ${n === 1 ? tr.table : tr.tables}`;

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
                label: tr.round(round),
                formula: `⌈${matches} / ${tLabel(T)}⌉ × ${mEff} min`,
                result: `${dur} min`,
            });
            currentPlayers = Math.ceil(currentPlayers / 2);
            round++;
        }
        steps.push({ label: tr.total, formula: '', result: `${total} min`, highlight: true });
        return {
            title: tr.titles.elimination,
            params: `N=${N} ${tr.players} · ${tLabel(T)} · ${mEff} min/match`,
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
            title: tr.titles.roundRobin,
            params: `N=${N} ${tr.players} · ${tLabel(T)} · ${m} min/match`,
            steps: [
                { label: tr.labels.totalMatches, formula: `N×(N−1)/2${hasReturnLeg ? '×2' : ''} = ${N}×${N - 1}/2${hasReturnLeg ? '×2' : ''}`, result: `${totalMatches}` },
                { label: tr.labels.maxParallel, formula: `min(${tr.tables}, ⌊N/2⌋) = min(${T}, ${Math.floor(N / 2)})`, result: `${maxParallel}` },
                { label: tr.labels.parallelRounds, formula: `⌈${totalMatches} / ${maxParallel}⌉`, result: `${rounds}` },
                { label: tr.total, formula: `${rounds} × ${m} min`, result: `${total} min`, highlight: true },
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
            title: tr.titles.groups,
            params: `N=${N} ${tr.players} · ${tLabel(T)} · ${m} min/match`,
            steps: [
                { label: tr.labels.groupA, formula: `${p1}×(${p1}−1)/2${hasReturnLeg ? '×2' : ''}`, result: `${(p1 * (p1 - 1)) / 2 * (hasReturnLeg ? 2 : 1)} matches` },
                { label: tr.labels.groupB, formula: `${p2}×(${p2}−1)/2${hasReturnLeg ? '×2' : ''}`, result: `${(p2 * (p2 - 1)) / 2 * (hasReturnLeg ? 2 : 1)} matches` },
                { label: tr.labels.groupStage, formula: `⌈${groupMatches} / ${tLabel(T)}⌉ × ${m} min`, result: `${groupDur} min` },
                { label: tr.labels.koPhase, formula: `2 × ${m} min`, result: `${koDur} min` },
                { label: tr.total, formula: `${groupDur} + ${koDur}`, result: `${total} min`, highlight: true },
            ],
        };
    }

    // Fallback
    const total = Math.ceil(N / T) * m;
    return {
        title: tr.titles.estimate,
        params: `N=${N} · T=${T} · ${m} min/match`,
        steps: [
            { label: tr.total, formula: `⌈${N} / ${T}⌉ × ${m} min`, result: `${total} min`, highlight: true },
        ],
    };
}

export default function LobbyDurationWidget({ type, playerCount, matchDurationMin = 12, tableCount = 1, hasReturnLeg = false, startTime }: Props) {
    const t = useTranslations('lobbyDuration');
    const [showFormula, setShowFormula] = useState(false);

    const tr: Tr = {
        table: t('table'),
        tables: t('tables'),
        players: t('players'),
        total: t('total'),
        round: (n) => t('round', { n }),
        titles: {
            elimination: t('titles.elimination'),
            roundRobin: t('titles.roundRobin'),
            groups: t('titles.groups'),
            estimate: t('titles.estimate'),
        },
        labels: {
            totalMatches: t('labels.totalMatches'),
            maxParallel: t('labels.maxParallel'),
            parallelRounds: t('labels.parallelRounds'),
            groupA: t('labels.groupA'),
            groupB: t('labels.groupB'),
            groupStage: t('labels.groupStage'),
            koPhase: t('labels.koPhase'),
        },
    };

    const duration = useMemo(() => calculateTournamentDuration(type, playerCount, tableCount, matchDurationMin, hasReturnLeg), [type, playerCount, tableCount, matchDurationMin, hasReturnLeg]);
    const endTime = useMemo(() => getEstimatedEndTime(duration, startTime), [duration, startTime]);
    const formula = useMemo(() => buildFormulaSteps(type, playerCount, tableCount, matchDurationMin, hasReturnLeg, tr), [type, playerCount, tableCount, matchDurationMin, hasReturnLeg, tr]);

    const isFutureStart = startTime && startTime.getTime() > Date.now();

    if (playerCount < 2) return null;

    return (
        <div style={{ marginBottom: 'var(--spacing-6)' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-3)',
            }}>
                {/* Estimated Duration — clickable */}
                <button
                    onClick={() => setShowFormula(v => !v)}
                    style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                                <Hourglass size={16} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {t('estimatedDuration')}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.7rem', fontWeight: 600,
                                color: showFormula ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                                transition: 'color 0.2s',
                            }}>
                                <Sigma size={12} />
                                {t('formula')}
                            </div>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {formatDuration(duration)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                            {t('forParticipants', { count: playerCount })}
                        </div>
                    </div>
                </button>

                {/* Estimated End */}
                <div className="glass-panel" style={{
                    padding: 'var(--spacing-4)',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-secondary)' }}>
                        <Clock size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('estimatedEnd')}
                        </span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {endTime}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        {isFutureStart ? t('ifOnTime') : t('ifNow')}
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {formula.steps.map((step, i) => (
                                    <FormulaRow key={i} label={step.label} formula={step.formula} result={step.result} highlight={step.highlight} />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
