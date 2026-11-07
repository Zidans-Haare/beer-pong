'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Result {
    id: string;
    name1: string;
    name2: string;
    score1: number | null;
    score2: number | null;
    winnerId: string | null;
    p1Id: string | null;
    p2Id: string | null;
}

const STORAGE_KEY = 'tv_seen_match_ids';

export default function TvResultOverlay({ results }: { results: Result[] }) {
    const [newResult, setNewResult] = useState<Result | null>(null);
    const seenRef = useRef<string[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const playedIds = results.map(r => r.id);
        let seen = seenRef.current;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const stored: unknown = raw ? JSON.parse(raw) : [];
            if (Array.isArray(stored)) seen = stored.filter((id): id is string => typeof id === 'string');
        } catch {}

        // Find the first result that wasn't seen before
        const fresh = results.find(r => !seen.includes(r.id));

        // Always persist current played IDs
        seenRef.current = playedIds;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(playedIds)); } catch {}

        if (fresh) {
            setNewResult(fresh);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setNewResult(null), 5000);
        }
    }, [results]);
    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    const winner = newResult?.winnerId
        ? newResult.winnerId === newResult.p1Id
            ? newResult.name1
            : newResult.name2
        : null;

    return (
        <AnimatePresence>
            {newResult && (
                <motion.div
                    className="tv-result-backdrop"
                    key="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: "none",
                    }}
                >
                    <motion.div
                        className="tv-result-panel"
                        role="status"
                        initial={{ scale: 0.6, y: 60, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.05 }}
                        style={{
                            background: 'var(--color-surface)',
                            borderRadius: '8px',
                            padding: 'clamp(32px, 5vw, 72px) clamp(40px, 7vw, 100px)',
                            boxShadow: "none",
                            border: '2px solid var(--color-border)',
                            minWidth: 'clamp(320px, 55vw, 820px)',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Label */}
                        <div style={{
                            fontSize: "var(--tv-copy-size, 1.5rem)",
                            fontWeight: 800,
                            letterSpacing: "0",
                            textTransform: 'uppercase',
                            color: 'var(--color-text-subtle)',
                            marginBottom: 'clamp(16px, 2.5vw, 32px)',
                        }}>
                            Ergebnis
                        </div>

                        {/* Score row */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'clamp(16px, 3vw, 48px)',
                            marginBottom: 'clamp(20px, 3vw, 40px)',
                        }}>
                            {/* Player 1 */}
                            <div style={{ flex: 1, textAlign: 'right' }}>
                                <div style={{
                                    fontSize: "var(--tv-copy-size, 1.5rem)",
                                    fontWeight: newResult.winnerId === newResult.p1Id ? 900 : 400,
                                    color: newResult.winnerId === newResult.p1Id ? 'var(--color-text)' : 'var(--color-text-dim)',
                                    lineHeight: 1.1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {newResult.name1}
                                </div>
                            </div>

                            {/* Score */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'clamp(10px, 1.5vw, 20px)',
                                flexShrink: 0,
                            }}>
                                <span style={{
                                    fontSize: 'var(--tv-score-size, 4.5rem)',
                                    fontWeight: 900,
                                    color: newResult.winnerId === newResult.p1Id ? 'var(--color-primary)' : 'var(--color-text-dim)',
                                    lineHeight: 1,
                                    minWidth: '1.2ch',
                                    textAlign: 'center',
                                }}>
                                    {newResult.score1 ?? '–'}
                                </span>
                                <span style={{ fontSize: "var(--tv-copy-size, 1.5rem)", color: 'var(--color-border-strong)', fontWeight: 300 }}>:</span>
                                <span style={{
                                    fontSize: 'var(--tv-score-size, 4.5rem)',
                                    fontWeight: 900,
                                    color: newResult.winnerId === newResult.p2Id ? 'var(--color-primary)' : 'var(--color-text-dim)',
                                    lineHeight: 1,
                                    minWidth: '1.2ch',
                                    textAlign: 'center',
                                }}>
                                    {newResult.score2 ?? '–'}
                                </span>
                            </div>

                            {/* Player 2 */}
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{
                                    fontSize: "var(--tv-copy-size, 1.5rem)",
                                    fontWeight: newResult.winnerId === newResult.p2Id ? 900 : 400,
                                    color: newResult.winnerId === newResult.p2Id ? 'var(--color-text)' : 'var(--color-text-dim)',
                                    lineHeight: 1.1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {newResult.name2}
                                </div>
                            </div>
                        </div>

                        {/* Winner badge */}
                        {winner && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'var(--color-primary-light)',
                                    border: '1px solid var(--color-primary)',
                                    borderRadius: '6px',
                                    padding: 'clamp(6px, 0.8vw, 10px) clamp(18px, 2.5vw, 32px)',
                                    fontSize: "var(--tv-copy-size, 1.5rem)",
                                    fontWeight: 700,
                                    color: 'var(--color-primary)',
                                    letterSpacing: "0",
                                }}
                            >
                                <span style={{ fontWeight: 400, opacity: 0.7 }}>Sieger</span>
                                <span>{winner}</span>
                            </motion.div>
                        )}

                        {/* Progress bar */}
                        <motion.div
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: 5, ease: 'linear' }}
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '3px',
                                background: 'var(--color-primary)',
                                transformOrigin: 'left',
                            }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
