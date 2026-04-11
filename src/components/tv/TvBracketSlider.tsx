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

export default function TvBracketSlider({ rounds }: { rounds: Round[] }) {
    const [currentRound, setCurrentRound] = useState(0);
    const [fading, setFading] = useState(false);

    // Show each round for 5 seconds, then smoothly fade to next
    useEffect(() => {
        if (rounds.length <= 1) return;
        const id = setInterval(() => {
            setFading(true);
            setTimeout(() => {
                setCurrentRound(r => (r + 1) % rounds.length);
                setFading(false);
            }, 500);
        }, 5000);
        return () => clearInterval(id);
    }, [rounds.length]);

    if (rounds.length === 0) return null;

    const round = rounds[currentRound];

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Round indicator dots */}
            {rounds.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: 'clamp(10px, 1.5vw, 18px)', alignItems: 'center' }}>
                    {rounds.map((r, i) => (
                        <div key={r.round} style={{
                            width: i === currentRound ? 'clamp(20px, 2.5vw, 32px)' : 'clamp(6px, 0.8vw, 10px)',
                            height: 'clamp(6px, 0.8vw, 10px)',
                            borderRadius: '999px',
                            background: i === currentRound ? 'var(--color-primary)' : 'var(--color-border-strong)',
                            transition: 'all 0.4s ease',
                        }} />
                    ))}
                    <span style={{ fontSize: 'clamp(0.7rem, 1.1vw, 1rem)', fontWeight: 700, color: 'var(--color-text-dim)', marginLeft: '8px' }}>
                        {round.label}
                    </span>
                </div>
            )}
            {rounds.length === 1 && (
                <div style={{ fontSize: 'clamp(0.7rem, 1.1vw, 1rem)', fontWeight: 700, color: 'var(--color-text-dim)', marginBottom: 'clamp(10px, 1.5vw, 18px)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {round.label}
                </div>
            )}

            {/* Matches */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(8px, 1.2vw, 18px)',
                opacity: fading ? 0 : 1,
                transition: 'opacity 0.4s ease',
                flex: 1,
            }}>
                {round.matches.map(match => (
                    <div key={match.id} style={{
                        background: 'var(--color-surface)',
                        border: match.isActive ? '2px solid var(--color-lobby-border)' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        opacity: match.isPlayed && !match.isActive ? 0.65 : 1,
                        boxShadow: match.isActive ? 'var(--shadow-md)' : 'none',
                    }}>
                        {[
                            { name: match.name1, id: match.player1Id || match.team1Id, score: match.score1 },
                            { name: match.name2, id: match.player2Id || match.team2Id, score: match.score2 },
                        ].map((p, i) => {
                            const isWinner = match.winnerId && match.winnerId === p.id;
                            const isLoser = match.winnerId && match.winnerId !== p.id;
                            return (
                                <div key={i} style={{
                                    padding: 'clamp(10px, 1.3vw, 20px) clamp(14px, 1.8vw, 26px)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: isWinner ? 'var(--color-primary-light)' : 'transparent',
                                    borderBottom: i === 0 ? '1px solid var(--color-border)' : 'none',
                                }}>
                                    <span style={{
                                        fontSize: 'clamp(1rem, 1.8vw, 1.8rem)',
                                        fontWeight: isWinner ? 800 : isLoser ? 400 : 600,
                                        color: isLoser ? 'var(--color-text-dim)' : 'var(--color-text)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                    }}>
                                        {p.name || '?'}
                                    </span>
                                    {(p.score !== null && p.score !== undefined) && (
                                        <span style={{
                                            fontSize: 'clamp(1rem, 1.8vw, 1.8rem)',
                                            fontWeight: 800,
                                            color: isWinner ? 'var(--color-primary)' : 'var(--color-text-dim)',
                                            marginLeft: 'clamp(8px, 1vw, 16px)',
                                            minWidth: '24px',
                                            textAlign: 'right',
                                        }}>
                                            {p.score}
                                        </span>
                                    )}
                                    {match.isActive && (
                                        <span style={{
                                            fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                                            background: 'var(--color-lobby-light)',
                                            color: 'var(--color-lobby)',
                                            border: '1px solid var(--color-lobby-border)',
                                            borderRadius: '999px',
                                            padding: '2px 8px',
                                            marginLeft: '8px',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                        }}>LIVE</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
