'use client';

import { useState } from 'react';
import { Match, Player } from '@prisma/client';
import MatchEditForm from './MatchEditForm';
import { getTeamDisplayName } from '@/lib/team-utils';

export default function Bracket({ matches }: { matches: any[] }) {
    const [editingMatch, setEditingMatch] = useState<any>(null);

    // Filter only bracket matches
    const bracketMatches = matches.filter(m => m.stage === 'BRACKET');

    // Determine max round for dynamic labeling
    const maxRound = bracketMatches.length > 0 ? Math.max(...bracketMatches.map(m => m.round)) : 0;

    // Organize matches by round
    const rounds = bracketMatches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
    }, {} as Record<number, any[]>);

    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

    const getDynamicRoundName = (round: number) => {
        if (round === maxRound) return 'Finale / Platz 3';
        if (round === maxRound - 1) return 'Halbfinale';
        if (round === maxRound - 2) return 'Viertelfinale';
        return `Runde ${round}`;
    };

    if (bracketMatches.length === 0) {
        return <div style={{ padding: 'var(--spacing-4)', textAlign: 'center', color: 'var(--color-text-dim)' }}>K.O.-Phase beginnt erst nach der Gruppenphase.</div>;
    }

    return (
        <>
            <div style={{ display: 'flex', overflowX: 'auto', gap: 'var(--spacing-8)', padding: 'var(--spacing-4)' }}>
                {roundNumbers.map((round) => (
                    <div key={round} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 'var(--spacing-8)' }}>
                        <h3 style={{ textAlign: 'center', marginBottom: 'var(--spacing-4)', color: 'var(--color-secondary)' }}>
                            {getDynamicRoundName(round)}
                        </h3>
                        {rounds[round].sort((a: any, b: any) => a.position - b.position).map((match: any) => {
                            const isTeamMatch = !!match.team1Id && !!match.team2Id;
                            const name1 = isTeamMatch && match.team1 
                                ? getTeamDisplayName(match.team1) 
                                : (match.player1?.name || 'TBD');
                            const name2 = isTeamMatch && match.team2 
                                ? getTeamDisplayName(match.team2) 
                                : (match.player2?.name || 'TBD');
                            
                            return (
                                <div
                                    key={match.id}
                                    className="glass-panel"
                                    style={{ padding: 'var(--spacing-3)', width: '200px', flexShrink: 0, cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onClick={() => setEditingMatch(match)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderBottom: getMatchSideClass(match, isTeamMatch, true) }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{name1}</span>
                                        <span>{match.score1}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', borderBottom: getMatchSideClass(match, isTeamMatch, false) }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{name2}</span>
                                        <span>{match.score2}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            {editingMatch && <MatchEditForm match={editingMatch} onClose={() => setEditingMatch(null)} />}
        </>
    );
}

function getMatchSideClass(match: any, isTeamMatch: boolean, isSide1: boolean): string {
    if (isTeamMatch) {
        const teamId = isSide1 ? match.team1Id : match.team2Id;
        if (!teamId) return '1px solid transparent';
        if (match.winnerTeamId === teamId) return '2px solid var(--color-success)';
        if (match.winnerTeamId && match.winnerTeamId !== teamId) return '1px solid var(--color-error)';
        return '1px solid var(--color-border)';
    } else {
        const playerId = isSide1 ? match.player1Id : match.player2Id;
        if (!playerId) return '1px solid transparent';
        if (match.winnerId === playerId) return '2px solid var(--color-success)';
        if (match.winnerId && match.winnerId !== playerId) return '1px solid var(--color-error)';
        return '1px solid var(--color-border)';
    }
}
