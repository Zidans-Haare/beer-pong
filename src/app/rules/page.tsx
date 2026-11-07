import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Section { title: string; items: string[] }

// **fett** in den Regeltexten
function rich(text: string): ReactNode {
    return text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

export default async function RulesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
    // Wer von einer anderen Seite (z. B. der Turnier-Zusage) hierherkommt, soll mit „Zurück“ auch dorthin zurück
    const { from } = await searchParams;
    const backHref = from && /^\/(?!\/)[\w\-\/]*$/.test(from) ? from : '/';
    const t = await getTranslations('rules');
    // Die Hausregeln sind fest eingebaut (messages/de.json und en.json)
    const sections = t.raw('sections') as Section[];

    return (
        <div className="container page-content" style={{ paddingBottom: '100px' }}>
            <Link href={backHref} className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
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

            </div>
        </div>
    );
}
