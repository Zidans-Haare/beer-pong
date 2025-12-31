import { getPlayers } from '@/app/actions/players';
import PlayerForm from './player-form';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
    const players = await getPlayers();

    return (
        <div className="container">
            <header style={{ marginBottom: 'var(--spacing-8)' }}>
                <h1 className="title-gradient" style={{ fontSize: 'var(--font-size-2xl)' }}>Spieler Management</h1>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-8)' }}>
                <aside>
                    <PlayerForm />
                </aside>

                <section className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-4)' }}>Registrierte Spieler ({players.length})</h2>

                    {players.length === 0 ? (
                        <p style={{ color: 'var(--color-text-dim)' }}>Noch keine Spieler registriert.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
                            {players.map((player) => (
                                <Link key={player.id} href={`/players/${player.id}`} className="player-card glass-panel" style={{ textDecoration: 'none', display: 'block', transition: 'transform 0.2s' }}>
                                    <div style={{ padding: 'var(--spacing-4)' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '4px', color: 'white' }}>{player.name}</div>
                                        {player.nickname && (
                                            <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>"{player.nickname}"</div>
                                        )}
                                        {player.motto && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', fontStyle: 'italic', marginTop: 'var(--spacing-2)' }}>{player.motto}</div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
