'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function PlayerProfilePrompt() {
    const t = useTranslations('playerProfile');
    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
            <p style={{ marginBottom: 'var(--spacing-2)' }}>{t('noProfile')}</p>
            <Link href="/players/new" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
                {t('createProfile')}
            </Link>
        </div>
    );
}
