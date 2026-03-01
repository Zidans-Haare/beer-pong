import { getAdminPlayers } from '@/app/actions/admin';
import PlayersClient from './players-client';

export const dynamic = 'force-dynamic';

export default async function AdminPlayersPage() {
    const result = await getAdminPlayers();
    const players = result.success ? result.players ?? [] : [];

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>Spieler</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>{players.length} registrierte Spieler</p>
            </header>
            <PlayersClient players={players} />
        </div>
    );
}
