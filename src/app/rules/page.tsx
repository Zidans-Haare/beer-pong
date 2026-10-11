import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { getPublicSystemSettings } from '@/app/actions/admin';
import { getTranslations } from 'next-intl/server';
import { ScrollText, Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Section { title: string; items: string[] }

// **fett** in den Regeltexten
function rich(text: string): ReactNode {
    return text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

export default async function RulesPage() {
    const [settings, t] = await Promise.all([getPublicSystemSettings(), getTranslations('rules')]);
    // Die Hausregeln sind fest eingebaut; was der Admin in den Einstellungen einträgt, kommt als Ergänzung dazu
    const sections = t.raw('sections') as Section[];
    const adminText = (settings.rulesText ?? '').trim();

    return (
        <div className="container page-content" style={{ paddingBottom: '100px' }}>
            <Link href="/" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
                &larr; {t('back')}
            </Link>

            <header style={{ marginBottom: 'var(--spacing-6)' }}>
                <h1 className="title-display" style={{ fontSize: '2.5rem' }}>{t('title')}</h1>
                <p style={{ color: 'var(--color-text-dim)', margin: '6px 0 0' }}>{t('sectionsHint')}</p>
            </header>

            <Link href="/game" className="rules-game">
                <span className="film-link-play" aria-hidden="true"><Play size={22} fill="currentColor" /></span>
                <span>
                    <strong>{t('gameTitle')}</strong>
                    <span>{t('gameText')}</span>
                </span>
            </Link>

            <div className="glass-panel" style={{ padding: 'var(--spacing-8)' }}>
                {sections.map(section => (
                    <section key={section.title} className="rules-section">
                        <h2>{section.title}</h2>
                        <ul>{section.items.map(item => <li key={item}>{rich(item)}</li>)}</ul>
                    </section>
                ))}

                {adminText && (
                    <section className="rules-section">
                        <h2><ScrollText size={18} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 6 }} />{t('adminTitle')}</h2>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--color-text)', margin: 0 }}>
                            {adminText}
                        </pre>
                    </section>
                )}
            </div>
        </div>
    );
}
