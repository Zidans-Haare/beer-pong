import { getTournaments } from '@/app/actions/tournaments';
import Link from 'next/link';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar, MapPin, Gamepad2, ArrowRight, ChevronLeft } from 'lucide-react';
import { getTournamentTypeLabel } from '@/lib/tournament-utils';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function TournamentsArchivePage() {
    const [allTournaments, t] = await Promise.all([getTournaments(), getTranslations('tournaments')]);
    const completedTournaments = allTournaments
        .filter(tournament => tournament.status === 'COMPLETED')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <div style={{ marginBottom: 'var(--spacing-8)' }}>
                <Link
                    href="/tournaments"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        color: 'var(--color-text-dim)',
                        textDecoration: 'none',
                        marginBottom: 'var(--spacing-4)',
                    }}
                >
                    <ChevronLeft size={16} /> {t('backToTournaments')}
                </Link>
                <h1 className="title-display" style={{ fontSize: '2rem' }}>{t('archiveTitle')}</h1>
                <p className="subtitle" style={{ fontSize: '0.9rem' }}>
                    {t('archivedCount', { count: completedTournaments.length })}
                </p>
            </div>

            {completedTournaments.length === 0 ? (
                <p style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: 'var(--spacing-12)' }}>
                    {t('noArchived')}
                </p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-6)', opacity: 0.85 }}>
                    {completedTournaments.map((tournament) => (
                        <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="glass-panel card-interactive" style={{
                            padding: 'var(--spacing-6)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--spacing-4)',
                            textDecoration: 'none',
                            color: 'inherit',
                            border: '1px solid var(--color-border)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <h3 style={{ fontSize: '1.3rem', lineHeight: 1.2, color: 'var(--color-text)', fontWeight: 700 }}>{tournament.name}</h3>
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    background: 'var(--color-surface-hover)',
                                    color: 'var(--color-text-dim)',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {t('ended')}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.9 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                    <Calendar size={16} />
                                    <span>{format(new Date(tournament.date), 'MM/dd/yyyy', { locale: enUS })}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                    <MapPin size={16} />
                                    <span>{tournament.location}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                    <Gamepad2 size={16} />
                                    <span>{getTournamentTypeLabel(tournament.type)}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: 'var(--spacing-4)', display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-dim)', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {t('results')} <ArrowRight size={16} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
