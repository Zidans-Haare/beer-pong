'use client';

import { useState } from 'react';
import { Match, Player } from '@prisma/client';
import MatchEditForm from './MatchEditForm';

type MatchWithPlayers = Match & {
    player1: Player | null;
    player2: Player | null;
};

export default function Bracket({ matches }: { matches: any[] }) {
    const [editingMatch, setEditingMatch] = useState<any>(null);

    // Organize matches by round
    const rounds = matches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
    }, {} as Record<number, any[]>);

    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

    return (
        <>
            <div style={{ display: 'flex', overflowX: 'auto', gap: 'var(--spacing-8)', padding: 'var(--spacing-4)' }}>
                {roundNumbers.map((round) => (
                    <div key={round} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 'var(--spacing-8)' }}>
                        <h3 style={{ textAlign: 'center', marginBottom: 'var(--spacing-4)' }}>Runde {round}</h3>
                        {rounds[round].sort((a: any, b: any) => a.position - b.position).map((match: any) => (
                            <div
                                key={match.id}
                                className="glass-panel"
                                style={{ padding: 'var(--spacing-3)', width: '200px', flexShrink: 0, cursor: 'pointer', transition: 'transform 0.2s' }}
                                onClick={() => setEditingMatch(match)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderBottom: playerClass(match, match.player1Id) }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.player1?.name || 'TBD'}</span>
                                    <span>{match.score1}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', borderBottom: playerClass(match, match.player2Id) }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.player2?.name || 'TBD'}</span>
                                    <span>{match.score2}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {editingMatch && <MatchEditForm match={editingMatch} onClose={() => setEditingMatch(null)} />}
        </>
    );
}

function playerClass(match: any, playerId: string | null | undefined): string {
    if (!playerId) return '1px solid transparent';
    if (match.winnerId === playerId) return '2px solid var(--color-success)';
    if (match.winnerId && match.winnerId !== playerId) return '1px solid var(--color-error)';
    return '1px solid var(--color-border)';
}
