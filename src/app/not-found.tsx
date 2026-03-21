import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
    const t = await getTranslations('notFound');
    return (
        <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--spacing-16)' }}>
            <h1 className="title-gradient" style={{ fontSize: '6rem', marginBottom: 'var(--spacing-4)' }}>404</h1>
            <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-8)' }}>
                {t('title')}
            </p>
            <Link href="/" className="btn btn-primary">{t('home')}</Link>
        </div>
    );
}
