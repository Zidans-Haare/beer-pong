'use client';

import { useState } from 'react';
import { Match, Player } from '@prisma/client';
import MatchEditForm from '@/components/MatchEditForm';
import { MatchStatusBadge } from './MatchStatusBadge';

// Define a type that includes the relations we need
type MatchWithPlayers = Match & {
    player1: Player | null;
    player2: Player | null;
    scheduledStart?: Date; // Add this
};

interface PlayerMatchesListProps {
    matches: MatchWithPlayers[];
    currentPlayerId: string;
}

export default function PlayerMatchesList({ matches, currentPlayerId }: PlayerMatchesListProps) {
    const [editingMatch, setEditingMatch] = useState<MatchWithPlayers | null>(null);

    const myMatches = matches.filter(m => m.player1Id === currentPlayerId || m.player2Id === currentPlayerId);

    // Find next playable match (no winner yet)
    // Sort by round first, then by position to get correct order
    const pendingMatches = myMatches.filter(m => !m.winnerId).sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.position - b.position;
    });
    const nextMatch = pendingMatches[0];

    // Calculate max bracket round to determine labels dynamically
    const bracketMatches = matches.filter(m => m.stage === 'BRACKET');
    const maxBracketRound = bracketMatches.length > 0 ? Math.max(...bracketMatches.map(m => m.round)) : 0;

    const getRoundLabel = (match: MatchWithPlayers) => {
        if (match.stage && match.stage.includes('GROUP')) {
            return `Gruppenphase - Runde ${match.round}`;
        }

        if (match.stage === 'BRACKET') {
            if (match.round === maxBracketRound) {
                return match.position === 1 ? 'Spiel um Platz 3' : 'Finale';
            }
            if (match.round === maxBracketRound - 1) return 'Halbfinale';
            if (match.round === maxBracketRound - 2) return 'Viertelfinale';
            return `K.O.-Runde ${match.round}`;
        }

        // Fallback for LEAGUE or others
        return `Runde ${match.round}`;
    };

    return (
        <div style={{ marginBottom: 'var(--spacing-12)' }}>
            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>Deine Spiele</h2>

            {/* Next Match Card */}
            {nextMatch ? (
                <div
                    className="glass-panel"
                    onClick={() => setEditingMatch(nextMatch)}
                    style={{ padding: 'var(--spacing-6)', border: '2px solid var(--color-primary)', marginBottom: 'var(--spacing-8)', cursor: 'pointer', transition: 'transform 0.2s' }}
                >
                    <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-4)' }}>
                        <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '99px',
                            background: 'var(--color-primary)',
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                        }}>
                            NÄCHSTES SPIEL (Klicken zum Eintragen)
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 'var(--spacing-4)', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ color: nextMatch.player1Id === currentPlayerId ? 'var(--color-primary)' : 'var(--color-text)' }}>
                                {nextMatch.player1?.name || 'TBD'}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>RECHTS</div>
                        </div>

                        <div style={{ color: 'var(--color-text-dim)', fontSize: '1rem', textAlign: 'center' }}>VS</div>

                        <div style={{ textAlign: 'center' }}>
                            <span style={{ color: nextMatch.player2Id === currentPlayerId ? 'var(--color-primary)' : 'var(--color-text)' }}>
                                {nextMatch.player2?.name || 'TBD'}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>LINKS</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: 'var(--spacing-6)', textAlign: 'center', marginBottom: 'var(--spacing-8)' }}>
                    <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>Alle Spiele abgeschlossen!</p>
                </div>
            )}

            {/* My Matches List */}
            {myMatches.length === 0 ? (
                <p style={{ color: 'var(--color-text-dim)' }}>Du hast keine Spiele in diesem Turnier.</p>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                    {myMatches.map(match => {
                        const isMyWin = match.winnerId === currentPlayerId;
                        const isPlayed = !!match.winnerId;

                        return (
                            <div
                                key={match.id}
                                className="glass-panel"
                                onClick={() => !isPlayed && setEditingMatch(match)}
                                style={{
                                    padding: 'var(--spacing-4)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    opacity: isPlayed ? 0.7 : 1,
                                    cursor: isPlayed ? 'default' : 'pointer',
                                    border: isPlayed ? '1px solid var(--color-border)' : '1px solid var(--color-primary)'
                                }}
                            >
                                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                    {getRoundLabel(match)}
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-4)', fontWeight: 'bold', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ color: match.player1Id === currentPlayerId ? 'var(--color-primary)' : 'var(--color-text)' }}>{match.player1?.name}</span>
                                        {!isPlayed && <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>RECHTS</div>}
                                    </div>
                                    <span>vs</span>
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ color: match.player2Id === currentPlayerId ? 'var(--color-primary)' : 'var(--color-text)' }}>{match.player2?.name}</span>
                                        {!isPlayed && <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>LINKS</div>}
                                    </div>
                                </div>
                                <div>
                                    <MatchStatusBadge
                                        isPlayed={isPlayed}
                                        scheduledStart={match.scheduledStart}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editingMatch && <MatchEditForm match={editingMatch} onClose={() => setEditingMatch(null)} />}
        </div>
    );
}
