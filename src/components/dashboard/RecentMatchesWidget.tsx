
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

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'var(--spacing-3)' }}>
                {matches.map((match, idx) => {
                    const isTeamMatch = !!match.team1Id;
                    const name1 = getDisplayName(match.player1, match.team1);
                    const name2 = getDisplayName(match.player2, match.team2);
                    const initials1 = name1.slice(0, 2).toUpperCase();

                    const p1Winner = isTeamMatch
                        ? match.winnerTeamId === match.team1Id
                        : match.winnerId === match.player1Id;

                    const isWin = p1Winner;
                    const score = `${match.score1}:${match.score2}`;
                    const timeAgo = formatDistanceToNow(new Date(match.updatedAt), { addSuffix: true, locale: de });

                    return (
                        <div key={match.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 0',
                            borderBottom: idx < matches.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}>
                            {/* Avatar */}
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                background: isWin ? 'rgba(80,72,229,0.1)' : 'var(--color-surface-hover)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.75rem', fontWeight: 700,
                                color: isWin ? 'var(--color-primary)' : 'var(--color-text-dim)',
                            }}>
                                {initials1}
                            </div>

                            {/* Match Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    vs. {name2}
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: '1px' }}>
                                    {timeAgo}
                                </p>
                            </div>

                            {/* Result */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p style={{
                                    fontSize: '0.8rem', fontWeight: 700,
                                    color: isWin ? 'var(--color-success)' : 'var(--color-error)',
                                }}>
                                    {isWin ? 'SIEG' : 'NIED.'} {score}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
