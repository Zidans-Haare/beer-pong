
import { prisma } from '@/lib/prisma';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

async function getRecentMatches() {
    return await prisma.match.findMany({
        where: {
            isPlayed: true
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 5,
        include: {
            player1: true,
            player2: true,
            team1: true,
            team2: true
        }
    });
}

function getDisplayName(player: any, team: any) {
    if (team) return team.name;
    return player?.name || 'TBD';
}

export default async function RecentMatchesWidget() {
    const matches = await getRecentMatches();

    if (matches.length === 0) return null;

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
            <div className="widget-header">
                <span className="widget-title">Letzte Spiele</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-4)' }}>
                {matches.map((match) => {
                    const isTeamMatch = !!match.team1Id;
                    const name1 = getDisplayName(match.player1, match.team1);
                    const name2 = getDisplayName(match.player2, match.team2);

                    // Determine winner style
                    const p1Winner = isTeamMatch
                        ? match.winnerTeamId === match.team1Id
                        : match.winnerId === match.player1Id;

                    const p2Winner = isTeamMatch
                        ? match.winnerTeamId === match.team2Id
                        : match.winnerId === match.player2Id;

                    return (
                        <div key={match.id} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: 'var(--color-surface-hover)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.9rem'
                        }}>
                            <div style={{
                                textAlign: 'right',
                                fontWeight: p1Winner ? 700 : 400,
                                color: p1Winner ? 'var(--color-success)' : 'var(--color-text)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {name1}
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px'
                            }}>
                                <div style={{
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    background: 'var(--color-surface)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {match.score1} : {match.score2}
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>
                                    {formatDistanceToNow(new Date(match.updatedAt), { addSuffix: true, locale: de })}
                                </span>
                            </div>

                            <div style={{
                                textAlign: 'left',
                                fontWeight: p2Winner ? 700 : 400,
                                color: p2Winner ? 'var(--color-success)' : 'var(--color-text)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {name2}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
