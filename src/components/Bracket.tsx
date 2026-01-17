'use client';

import { useState } from 'react';
import { Match, Player } from '@prisma/client';
import MatchEditForm from './MatchEditForm';
import { getTeamDisplayName } from '@/lib/team-utils';

export default function Bracket({ matches, tableCount }: { matches: any[], tableCount: number }) {
    const [editingMatch, setEditingMatch] = useState<any>(null);

    // Filter only bracket matches
    const bracketMatches = matches.filter(m => m.stage === 'BRACKET');

    // Identify active matches (first unplayed match per table that has both players)
    const activeMatchIds = new Set<string>();
    for (let t = 1; t <= tableCount; t++) {
        const nextMatch = matches.find(m =>
            !m.isPlayed &&
            m.tableNumber === t &&
            (m.player1Id || m.team1Id) &&
            (m.player2Id || m.team2Id)
        );
        if (nextMatch) activeMatchIds.add(nextMatch.id);
    }

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

                            const isActive = activeMatchIds.has(match.id);

                            return (
                                <div
                                    key={match.id}
                                    className="glass-panel"
                                    style={{
                                        padding: 'var(--spacing-3)',
                                        width: '200px',
                                        flexShrink: 0,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                        boxShadow: isActive ? '0 0 15px var(--color-primary-glow)' : 'none',
                                        transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                        zIndex: isActive ? 10 : 1
                                    }}
                                    onClick={() => setEditingMatch(match)}
                                >
                                    {isActive && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-12px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: 'var(--color-primary)',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            boxShadow: 'var(--shadow-sm)',
                                            whiteSpace: 'nowrap',
                                            zIndex: 20
                                        }}>
                                            Tisch {match.tableNumber}
                                        </div>
                                    )}
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
