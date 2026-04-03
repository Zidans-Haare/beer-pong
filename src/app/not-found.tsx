import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
    let title = 'Page not found';
    let home = 'Go home';
    try {
        const t = await getTranslations('notFound');
        title = t('title');
        home = t('home');
    } catch {
        // next-intl locale context not available in root not-found (e.g. called from middleware)
    }
    return (
        <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--spacing-16)' }}>
            <h1 className="title-gradient" style={{ fontSize: '6rem', marginBottom: 'var(--spacing-4)' }}>404</h1>
            <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-8)' }}>
                {title}
            </p>
            <Link href="/" className="btn btn-primary">{home}</Link>
        </div>
    );
}
