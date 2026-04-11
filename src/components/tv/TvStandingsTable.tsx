'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Standing {
    playerId: string;
    playerName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    points: number;
    cupDiff: number;
}

interface Props {
    standings: Standing[];
    highlightTop?: number;
    label?: string;
}


export default function TvStandingsTable({ standings, highlightTop = 0, label = 'Spieler' }: Props) {
    const prevPositions = useRef<Record<string, number>>({});
    const [deltas, setDeltas] = useState<Record<string, number>>({});

    useEffect(() => {
        const newPositions: Record<string, number> = {};
        const newDeltas: Record<string, number> = {};

        standings.forEach((s, i) => {
            newPositions[s.playerId] = i;
            const prev = prevPositions.current[s.playerId];
            if (prev !== undefined && prev !== i) {
                newDeltas[s.playerId] = prev - i; // positive = moved up
            }
        });

        setDeltas(newDeltas);
        prevPositions.current = newPositions;

        // Clear delta indicators after 3s
        if (Object.keys(newDeltas).length > 0) {
            const t = setTimeout(() => setDeltas({}), 3000);
            return () => clearTimeout(t);
        }
    }, [standings]);

    if (standings.length === 0) return null;

    return (
        <div style={{ width: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 44px 44px 44px 60px 60px',
                gap: '4px',
                padding: 'clamp(6px, 0.8vw, 10px) clamp(10px, 1.5vw, 18px)',
                borderBottom: '2px solid var(--color-border)',
                fontSize: 'clamp(0.6rem, 0.85vw, 0.8rem)',
                fontWeight: 700,
                color: 'var(--color-text-subtle)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
            }}>
                <span>#</span>
                <span>{label}</span>
                <span style={{ textAlign: 'center' }}>Sp</span>
                <span style={{ textAlign: 'center', color: 'var(--color-success)' }}>S</span>
                <span style={{ textAlign: 'center', color: 'var(--color-error)' }}>N</span>
                <span style={{ textAlign: 'center' }}>Diff</span>
                <span style={{ textAlign: 'right' }}>Pkt</span>
            </div>

            {/* Rows — AnimatePresence for enter/exit, layout for position changes */}
            <AnimatePresence initial={false}>
                {standings.map((s, i) => {
                    const isTop = highlightTop > 0 && i < highlightTop;
                    const isFirst = i === 0;
                    const delta = deltas[s.playerId] ?? 0;
                    const movedUp = delta > 0;
                    const movedDown = delta < 0;

                    return (
                        <motion.div
                            key={s.playerId}
                            layoutId={s.playerId}
                            layout
                            initial={{ opacity: 0, y: -20 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                backgroundColor: movedUp
                                    ? ['rgba(74,222,128,0.25)', 'rgba(74,222,128,0.08)']
                                    : movedDown
                                    ? ['rgba(239,68,68,0.15)', 'transparent']
                                    : 'transparent',
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                layout: { type: 'spring', stiffness: 400, damping: 35 },
                                backgroundColor: { duration: 2.5 },
                            }}
                             style={{
                                display: 'grid',
                                gridTemplateColumns: '40px 1fr 44px 44px 44px 60px 60px',
                                gap: '4px',
                                padding: standings.length > 8 ? '4px clamp(10px, 1.5vw, 18px)' : 'clamp(8px, 1.1vw, 14px) clamp(10px, 1.5vw, 18px)',
                                borderBottom: '1px solid var(--color-border)',
                                borderLeft: isTop ? '3px solid var(--color-success)' : isFirst ? '3px solid var(--color-primary)' : '3px solid transparent',
                                alignItems: 'center',
                                position: 'relative',
                            }}
                        >
                            {/* Rank */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: standings.length > 8 ? 'clamp(0.75rem, 1.1vw, 1rem)' : 'clamp(0.85rem, 1.2vw, 1.1rem)', fontWeight: 700, color: i === 0 ? 'var(--color-primary)' : 'var(--color-text-dim)' }}>{i + 1}</span>
                            </div>

                            {/* Name + delta indicator */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <span style={{
                                    fontSize: standings.length > 8 ? 'clamp(0.85rem, 1.3vw, 1.2rem)' : 'clamp(0.9rem, 1.6vw, 1.5rem)',
                                    fontWeight: isFirst ? 800 : 600,
                                    color: isFirst ? 'var(--color-text)' : 'var(--color-text)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {s.playerName}
                                </span>
                                <AnimatePresence>
                                    {(movedUp || movedDown) && (
                                        <motion.span
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            style={{
                                                fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                                                fontWeight: 800,
                                                color: movedUp ? 'var(--color-success)' : 'var(--color-error)',
                                                background: movedUp ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.12)',
                                                borderRadius: '999px',
                                                padding: '1px 6px',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {movedUp ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Stats */}
                            <span style={{ textAlign: 'center', fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', color: 'var(--color-text-dim)' }}>{s.matchesPlayed}</span>
                            <span style={{ textAlign: 'center', fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', fontWeight: 700, color: 'var(--color-success)' }}>{s.wins}</span>
                            <span style={{ textAlign: 'center', fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', color: 'var(--color-error)' }}>{s.losses}</span>
                            <span style={{ textAlign: 'center', fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', color: s.cupDiff > 0 ? 'var(--color-success)' : s.cupDiff < 0 ? 'var(--color-error)' : 'var(--color-text-dim)' }}>
                                {s.cupDiff > 0 ? `+${s.cupDiff}` : s.cupDiff}
                            </span>
                            <span style={{ textAlign: 'right', fontSize: 'clamp(0.9rem, 1.4vw, 1.3rem)', fontWeight: 800, color: 'var(--color-primary)' }}>{s.points}</span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {highlightTop > 0 && (
                <div style={{ padding: 'clamp(6px, 0.8vw, 10px) clamp(10px, 1.5vw, 18px)', fontSize: 'clamp(0.6rem, 0.85vw, 0.8rem)', color: 'var(--color-text-subtle)', textAlign: 'right' }}>
                    <span style={{ color: 'var(--color-success)', marginRight: '5px' }}>●</span>
                    Top {highlightTop} qualifizieren sich
                </div>
            )}
        </div>
    );
}
