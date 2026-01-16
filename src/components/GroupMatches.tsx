
'use client';

import { Match, Player } from '@prisma/client';
import { MatchStatusBadge } from './MatchStatusBadge';

type MatchWithPlayers = Match & {
    player1: Player | null;
    player2: Player | null;
};

export default function GroupMatches({ matches }: { matches: MatchWithPlayers[] }) {
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
                                {byRound[round].map(match => (
                                    <div key={match.id} style={{
                                        padding: 'var(--spacing-2)',
                                        background: 'var(--color-surface-hover)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: match.winnerId ? '1px solid var(--color-border)' : '1px dashed var(--color-border)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span style={{ fontWeight: match.winnerId === match.player1Id ? 'bold' : 'normal', color: match.winnerId === match.player1Id ? 'var(--color-success)' : 'inherit' }}>
                                                {match.player1?.name}
                                            </span>
                                            <span>{match.score1}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span style={{ fontWeight: match.winnerId === match.player2Id ? 'bold' : 'normal', color: match.winnerId === match.player2Id ? 'var(--color-success)' : 'inherit' }}>
                                                {match.player2?.name}
                                            </span>
                                            <span>{match.score2}</span>
                                        </div>
                                        <div style={{ textAlign: 'center', marginTop: '2px' }}>
                                            {/* Small status indicator if needed */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
