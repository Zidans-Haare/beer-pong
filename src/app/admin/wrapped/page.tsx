import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { format } from 'date-fns';
import { getSeasons } from '@/lib/seasons';
import { loadWrapped } from '@/lib/wrapped-server';
import WrappedManager from './wrapped-manager';

export const dynamic = 'force-dynamic';

export default async function AdminWrappedPage() {
    const [t, seasons, existing] = await Promise.all([
        getTranslations('admin.wrapped'),
        getSeasons(),
        prisma.wrapped.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    const now = new Date();
    const year = now.getFullYear();
    // Zeiträume zur Auswahl: Kalenderjahr und jede Saison (laufende Saison bis jetzt)
    const scopes = [
        { id: `year-${year}`, label: t('scopeYear', { year }), title: `Wrapped ${year}`, from: new Date(year, 0, 1), to: new Date(year + 1, 0, 1) },
        ...seasons.map(s => ({ id: `season-${s.id}`, label: t('scopeSeason', { name: s.name }), title: `Wrapped ${s.name}`, from: s.startDate, to: s.endDate ?? now })),
    ];
    const withCounts = await Promise.all(scopes.map(async s => ({
        id: s.id, label: s.label, title: s.title, from: s.from.toISOString(), to: s.to.toISOString(),
        players: (await loadWrapped({ start: s.from, end: s.to })).size,
    })));

    const fmt = (d: Date) => format(d, 'dd.MM.yyyy');

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>{t('title')}</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>{t('subtitle')}</p>
            </header>
            <WrappedManager
                scopes={withCounts}
                existing={existing.map(w => ({ id: w.id, title: w.title, range: `${fmt(w.startDate)} – ${fmt(w.endDate)}`, published: !!w.publishedAt, publishedAt: w.publishedAt ? fmt(w.publishedAt) : null }))}
            />
        </div>
    );
}
