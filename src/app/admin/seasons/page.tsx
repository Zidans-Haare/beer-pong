import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { format } from 'date-fns';
import SeasonManager from './season-manager';

export const dynamic = 'force-dynamic';

export default async function AdminSeasonsPage() {
    const [t, seasons] = await Promise.all([
        getTranslations('admin.seasons'),
        prisma.season.findMany({ orderBy: { startDate: 'desc' } }),
    ]);
    const current = seasons.find(s => !s.endDate) ?? null;
    const past = seasons.filter(s => s.endDate);
    const fmt = (d: Date) => format(d, 'dd.MM.yyyy');

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>{t('title')}</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>{t('subtitle')}</p>
            </header>

            {current && (
                <SeasonManager
                    current={{ id: current.id, name: current.name, accentColor: current.accentColor, sinceLabel: current.startDate.getFullYear() < 2010 ? t('sinceStart') : t('since', { date: fmt(current.startDate) }) }}
                    suggestedName={t('suggestedName', { number: seasons.length + 1 })}
                    previous={past[0] ? { name: past[0].name, accentColor: past[0].accentColor } : null}
                />
            )}

            <section>
                <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--spacing-3)' }}>{t('past')}</h2>
                {past.length === 0 ? (
                    <p style={{ color: 'var(--color-text-dim)' }}>{t('noPast')}</p>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                        {past.map(s => (
                            <article key={s.id} className="glass-panel" style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderLeft: `4px solid ${s.accentColor}` }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{s.name}</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    {fmt(s.startDate)} – {fmt(s.endDate!)}
                                </p>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
