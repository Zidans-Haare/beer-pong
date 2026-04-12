'use client';

import { useEffect, useRef, useState } from 'react';

type Match = {
    id: string;
    round: number;
    isPlayed: boolean;
    score1?: number | null;
    score2?: number | null;
    winnerId?: string | null;
    player1Id?: string | null;
    player2Id?: string | null;
    team1Id?: string | null;
    team2Id?: string | null;
    name1: string;
    name2: string;
    isActive: boolean;
};

type Round = {
    round: number;
    label: string;
    matches: Match[];
};

// Global state to survive Next.js router.refresh() remounts
let globalSavedRound = 0;

const PAGE_SIZE = 4; // max matches visible at once in compact mode

export default function TvBracketSlider({ rounds, compact = false }: { rounds: Round[]; compact?: boolean }) {
    const [currentRound, setCurrentRound] = useState(() => {
        if (rounds.length > 0 && globalSavedRound >= rounds.length) return 0;
        return globalSavedRound;
    });
    const [page, setPage] = useState(0);
    const [fading, setFading] = useState(false);

    const round = rounds[currentRound] ?? rounds[0];
    const totalPages = round ? Math.ceil(round.matches.length / PAGE_SIZE) : 1;

    // Auto-advance: cycle pages within a round, then move to next round
    useEffect(() => {
        if (rounds.length <= 1 && totalPages <= 1) return;

        const id = setInterval(() => {
            setFading(true);
            setTimeout(() => {
                setPage(p => {
                    const nextPage = p + 1;
                    if (nextPage < totalPages) {
                        // more pages in this round
                        return nextPage;
                    }
                    // move to next round
                    setCurrentRound(r => {
                        const next = (r + 1) % rounds.length;
                        globalSavedRound = next;
                        return next;
                    });
                    return 0;
                });
                setFading(false);
            }, 400);
        }, 7000);
        return () => clearInterval(id);
    }, [rounds.length, totalPages]);

    // Reset page when round changes externally
    useEffect(() => { setPage(0); }, [currentRound]);

    if (rounds.length === 0 || !round) return null;

    const visibleMatches = compact
        ? round.matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        : round.matches;

    const cols = !compact && round.matches.length > 4 ? '1fr 1fr' : '1fr';

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            {/* Header: label + dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: compact ? '8px' : 'clamp(6px, 1vw, 12px)', flexShrink: 0 }}>
                <span style={{
                    fontSize: compact ? '0.72rem' : 'clamp(0.7rem, 1.1vw, 1rem)',
                    fontWeight: 700,
                    color: 'var(--color-text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                }}>
                    {round.label}
                </span>
                {/* Page indicator (within round) */}
                {totalPages > 1 && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-subtle)' }}>
                        {page + 1}/{totalPages}
                    </span>
                )}
                <div style={{ flex: 1 }} />
                {/* Round dots */}
                {rounds.length > 1 && rounds.map((r, i) => (
                    <div key={r.round} style={{
                        width: i === currentRound ? (compact ? 16 : 'clamp(20px, 2.5vw, 32px)') : (compact ? 6 : 'clamp(6px, 0.8vw, 10px)'),
                        height: compact ? 6 : 'clamp(6px, 0.8vw, 10px)',
                        borderRadius: '999px',
                        background: i === currentRound ? 'var(--color-primary)' : 'var(--color-border-strong)',
                        transition: 'all 0.4s ease',
                        flexShrink: 0,
                    }} />
                ))}
            </div>

            {/* Matches */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: cols,
                gap: compact ? '6px' : 'clamp(6px, 1vw, 12px) clamp(10px, 1.5vw, 20px)',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.4s ease',
                alignContent: 'start',
                overflow: 'hidden',
                flex: 1,
            }}>
                {visibleMatches.map(match => {
                    const p1id = match.player1Id || match.team1Id;
                    const p2id = match.player2Id || match.team2Id;
                    const hasScore = match.score1 !== null && match.score1 !== undefined;
                    const p1won = match.winnerId && match.winnerId === p1id;
                    const p2won = match.winnerId && match.winnerId === p2id;

                    if (compact && !hasScore && !match.isActive) {
                        // Unplayed compact: clean single-row "Name1 vs Name2"
                        return (
                            <div key={match.id} style={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '7px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: 0.8,
                            }}>
                                <span style={{
                                    flex: 1, fontSize: '0.8rem', fontWeight: 600,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    textAlign: 'right', color: 'var(--color-text)',
                                }}>{match.name1}</span>
                                <span style={{
                                    fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-subtle)',
                                    flexShrink: 0, padding: '2px 5px',
                                    background: 'var(--color-surface-secondary)',
                                    borderRadius: '4px',
                                }}>vs</span>
                                <span style={{
                                    flex: 1, fontSize: '0.8rem', fontWeight: 600,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    color: 'var(--color-text)',
                                }}>{match.name2}</span>
                            </div>
                        );
                    }

                    // Played or active: two-row layout with scores
                    return (
                        <div key={match.id} style={{
                            background: 'var(--color-surface)',
                            border: match.isActive ? '2px solid var(--color-lobby-border)' : '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            opacity: match.isPlayed && !match.isActive ? 0.7 : 1,
                            boxShadow: match.isActive ? 'var(--shadow-md)' : 'none',
                        }}>
                            {[
                                { name: match.name1, id: p1id, score: match.score1, won: p1won },
                                { name: match.name2, id: p2id, score: match.score2, won: p2won },
                            ].map((p, i) => (
                                <div key={i} style={{
                                    padding: compact ? '5px 10px' : 'clamp(6px, 1vw, 14px) clamp(10px, 1.5vw, 20px)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: p.won ? 'var(--color-primary-light)' : 'transparent',
                                    borderBottom: i === 0 ? '1px solid var(--color-border)' : 'none',
                                }}>
                                    <span style={{
                                        fontSize: compact ? '0.82rem' : 'clamp(0.9rem, 1.5vw, 1.5rem)',
                                        fontWeight: p.won ? 800 : (!p.won && match.winnerId) ? 400 : 600,
                                        color: (!p.won && match.winnerId) ? 'var(--color-text-dim)' : 'var(--color-text)',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                                    }}>
                                        {p.name || '?'}
                                    </span>
                                    {hasScore && (
                                        <span style={{
                                            fontSize: compact ? '0.82rem' : 'clamp(0.9rem, 1.5vw, 1.5rem)',
                                            fontWeight: 800,
                                            color: p.won ? 'var(--color-primary)' : 'var(--color-text-dim)',
                                            marginLeft: compact ? '6px' : 'clamp(8px, 1vw, 16px)',
                                            minWidth: '20px', textAlign: 'right',
                                        }}>
                                            {p.score}
                                        </span>
                                    )}
                                    {match.isActive && i === 0 && (
                                        <span style={{
                                            fontSize: '0.62rem',
                                            background: 'var(--color-lobby-light)',
                                            color: 'var(--color-lobby)',
                                            border: '1px solid var(--color-lobby-border)',
                                            borderRadius: '999px',
                                            padding: '1px 6px', marginLeft: '6px',
                                            fontWeight: 700, whiteSpace: 'nowrap',
                                        }}>LIVE</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
