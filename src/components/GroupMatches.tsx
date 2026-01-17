
'use client';

import { useState } from 'react';
import { Match, Player } from '@prisma/client';
import MatchEditForm from './MatchEditForm';

type MatchWithPlayers = Match & {
    player1: Player | null;
    player2: Player | null;
    tableNumber?: number;
};

export default function GroupMatches({ matches, tableCount }: { matches: MatchWithPlayers[], tableCount: number }) {
    const [editingMatch, setEditingMatch] = useState<MatchWithPlayers | null>(null);

    // Identify active matches (first unplayed match per table that has both players)
    const activeMatchIds = new Set<string>();
    for (let t = 1; t <= tableCount; t++) {
        const nextMatch = matches.find(m =>
            !m.isPlayed &&
            (m as any).tableNumber === t &&
            (m.player1Id || m.team1Id) &&
            (m.player2Id || m.team2Id)
        );
        if (nextMatch) activeMatchIds.add(nextMatch.id);
    }

    // Filter group matches
    const groupMatches = matches.filter(m => m.stage.includes('GROUP') || m.stage === 'LEAGUE');

    if (groupMatches.length === 0) return null;

    // Group by Round
    const byRound: Record<number, MatchWithPlayers[]> = {};
    groupMatches.forEach(m => {
        if (!byRound[m.round]) byRound[m.round] = [];
        byRound[m.round].push(m);
    });

    const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

    return (
        <>
            <div style={{ marginBottom: 'var(--spacing-8)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-text-dim)' }}>Gruppenspiele Übersicht</h3>
                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', overflowX: 'auto' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-8)' }}>
                        {rounds.map(round => (
                            <div key={round} style={{ minWidth: '200px' }}>
                                <h4 style={{
                                    textAlign: 'center',
                                    marginBottom: 'var(--spacing-3)',
                                    borderBottom: '1px solid var(--color-border)',
                                    paddingBottom: 'var(--spacing-2)',
                                    color: 'var(--color-primary)'
                                }}>
                                    Runde {round}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                    {byRound[round].map(match => {
                                        const isActive = activeMatchIds.has(match.id);
                                        return (
                                            <div
                                                key={match.id}
                                                onClick={() => setEditingMatch(match)}
                                                style={{
                                                    padding: 'var(--spacing-2)',
                                                    background: 'var(--color-surface-hover)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: isActive ? '2px solid var(--color-primary)' : (match.isPlayed ? '1px solid var(--color-border)' : '1px dashed var(--color-primary)'),
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    position: 'relative',
                                                    boxShadow: isActive ? '0 0 10px var(--color-primary-glow)' : 'none',
                                                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                                    marginTop: isActive ? '4px' : '0'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isActive) {
                                                        e.currentTarget.style.transform = 'scale(1.02)';
                                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive) {
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }
                                                }}
                                            >
                                                {isActive && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '-10px',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        background: 'var(--color-primary)',
                                                        color: 'white',
                                                        padding: '1px 6px',
                                                        borderRadius: 'var(--radius-full)',
                                                        fontSize: '0.6rem',
                                                        fontWeight: 'bold',
                                                        boxShadow: 'var(--shadow-sm)',
                                                        zIndex: 10
                                                    }}>
                                                        Tisch {match.tableNumber}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                    <span style={{ fontWeight: match.winnerId === match.player1Id ? 'bold' : 'normal', color: match.winnerId === match.player1Id ? 'var(--color-success)' : 'inherit' }}>
                                                        {match.player1?.name || 'TBD'}
                                                    </span>
                                                    <span>{match.isPlayed ? match.score1 : '-'}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                    <span style={{ fontWeight: match.winnerId === match.player2Id ? 'bold' : 'normal', color: match.winnerId === match.player2Id ? 'var(--color-success)' : 'inherit' }}>
                                                        {match.player2?.name || 'TBD'}
                                                    </span>
                                                    <span>{match.isPlayed ? match.score2 : '-'}</span>
                                                </div>
                                                {!match.isPlayed && !isActive && (
                                                    <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '0.7rem', color: 'var(--color-primary)' }}>
                                                        Tippe zum Eintragen
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {editingMatch && <MatchEditForm match={editingMatch} onClose={() => setEditingMatch(null)} />}
        </>
    );
}
