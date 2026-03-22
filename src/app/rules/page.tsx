import Link from 'next/link';
import { getPublicSystemSettings } from '@/app/actions/admin';
import { getTranslations } from 'next-intl/server';
import { ScrollText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RulesPage() {
    const [settings, t] = await Promise.all([getPublicSystemSettings(), getTranslations('rules')]);
    const rulesText = settings.rulesText ?? '';

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <Link href="/" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
                &larr; {t('back')}
            </Link>

            <header style={{ marginBottom: 'var(--spacing-8)' }}>
                <h1 className="title-display" style={{ fontSize: '2.5rem' }}>{t('title')}</h1>
            </header>

            <div className="glass-panel" style={{ padding: 'var(--spacing-8)' }}>
                {rulesText ? (
                    <pre style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem',
                        lineHeight: 1.7,
                        color: 'var(--color-text)',
                        margin: 0,
                    }}>
                        {rulesText}
                    </pre>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-4)', padding: 'var(--spacing-8)', color: 'var(--color-text-dim)' }}>
                        <ScrollText size={40} opacity={0.3} />
                        <p style={{ textAlign: 'center', margin: 0 }}>{t('empty')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
