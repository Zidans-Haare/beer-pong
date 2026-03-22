import { getAdminPlayers } from '@/app/actions/admin';
import PlayersClient from './players-client';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function AdminPlayersPage() {
    const [result, t] = await Promise.all([getAdminPlayers(), getTranslations('admin.players')]);
    const players = result.success ? result.players ?? [] : [];

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>{t('title')}</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>{players.length} {t('count')}</p>
            </header>
            <PlayersClient players={players} />
        </div>
    );
}
