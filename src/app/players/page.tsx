import { getPlayers } from '@/app/actions/players';
import { getAllPlayerStats } from '@/lib/stats';
import InviteButton from '@/components/InviteButton';
import Link from 'next/link';
import { User } from 'lucide-react';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
    const [players, stats] = await Promise.all([getPlayers(), getAllPlayerStats()]);

    const statsMap = new Map(stats.map(s => [s.name, s]));

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-6) 0 var(--spacing-4)' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>Spieler</h1>
                <InviteButton />
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-4)' }}>
                {players.length === 0 ? (
                    <div className="glass-panel" style={{ gridColumn: '1/-1', padding: 'var(--spacing-12)', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                        <div style={{ marginBottom: 'var(--spacing-4)', display: 'flex', justifyContent: 'center' }}>
                            <User size={48} style={{ opacity: 0.2 }} />
                        </div>
                        Noch keine Spieler registriert.
                    </div>
                ) : (
                    players.map((player: any) => {
                        const playerStats = statsMap.get(player.name);
                        return (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                winRate={playerStats ? Math.round(playerStats.winRate * 100) : undefined}
                                gamesPlayed={playerStats?.matchesPlayed}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}

function PlayerCard({ player, winRate, gamesPlayed }: { player: any; winRate?: number; gamesPlayed?: number }) {
    return (
        <Link href={`/players/${player.id}`} style={{ textDecoration: 'none', display: 'flex', height: '100%' }}>
            <div className="player-card-inner" style={{ width: '100%' }}>
                {/* Avatar */}
                <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    border: '2px solid rgba(80,72,229,0.15)',
                    overflow: 'hidden', background: 'var(--color-primary-light)',
                    flexShrink: 0,
                }}>
                    <Avatar src={player.image ? `${player.image}?v=3` : null} name={player.name} size={72} />
                </div>

                {/* Name */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
                        {player.name}
                    </p>
                    {player.nickname && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                            &quot;{player.nickname}&quot;
                        </p>
                    )}
                </div>

                {/* Stats */}
                <div style={{ textAlign: 'center' }}>
                    {winRate !== undefined ? (
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {winRate}% Winrate
                        </p>
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-subtle)' }}>Keine Spiele</p>
                    )}
                    {gamesPlayed !== undefined && gamesPlayed > 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                            {gamesPlayed} Spiele
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}
