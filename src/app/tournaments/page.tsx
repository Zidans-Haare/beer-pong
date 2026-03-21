import { getTournaments } from '@/app/actions/tournaments';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, MapPin, Gamepad2, Plus, ArrowRight } from 'lucide-react';
import { getTournamentTypeLabel } from '@/lib/tournament-utils';
import DrunkModeConditional from '@/components/DrunkModeConditional';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
    const t = await getTranslations('tournaments');
    const allTournaments = await getTournaments();

    // Lobby = PLANNED and date is today or in the past (happening now / imminent)
    // Geplant = PLANNED and date is tomorrow or later
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const lobbyTournaments = allTournaments.filter(tr => tr.status === 'PLANNED' && new Date(tr.date) <= todayEnd);
    const plannedTournaments = allTournaments.filter(tr => tr.status === 'PLANNED' && new Date(tr.date) > todayEnd);
    const activeTournaments = allTournaments.filter(tr => tr.status === 'ACTIVE');
    const completedTournaments = allTournaments.filter(tr => tr.status === 'COMPLETED');

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-8)' }}>
                <div>
                    <h1 className="title-display" style={{ fontSize: '2rem' }}>{t('title')}</h1>
                    <p className="subtitle" style={{ fontSize: '0.9rem' }}>{t('subtitle')}</p>
                </div>
                <Link href="/tournaments/new" className="btn btn-primary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} /> <span>{t('new')}</span>
                </Link>
            </div>

            {/* Lobbies — happening today */}
            {lobbyTournaments.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-12)' }}>
                    <h2 className="section-header" style={{ color: 'var(--color-lobby)' }}>
                        <span className="live-dot" style={{ background: 'var(--color-lobby)' }} /> {t('openLobbies')}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-6)' }}>
                        {lobbyTournaments.map((tournament) => (
                            <TournamentCard key={tournament.id} t={tournament} translations={t} />
                        ))}
                    </div>
                </div>
            )}

            {/* Planned — future date */}
            {plannedTournaments.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-12)' }}>
                    <h2 className="section-header">
                        {t('planned')}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-6)' }}>
                        {plannedTournaments.map((tournament) => (
                            <TournamentCard key={tournament.id} t={tournament} planned translations={t} />
                        ))}
                    </div>
                </div>
            )}

            {/* Active Tournaments */}
            {activeTournaments.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-12)' }}>
                    <h2 className="section-header" style={{ color: 'var(--color-primary)' }}>
                        <span className="live-dot" style={{ background: 'var(--color-primary)' }} /> {t('live')}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-6)' }}>
                        {activeTournaments.map((tournament) => (
                            <TournamentCard key={tournament.id} t={tournament} translations={t} />
                        ))}
                    </div>
                </div>
            )}

            {/* Archive — normal: full grid, drunk: only link */}
            {completedTournaments.length > 0 && (
                <>
                    <DrunkModeConditional show="sober">
                        <div>
                            <h2 className="section-header">{t('archive')}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-6)', opacity: 0.8 }}>
                                {completedTournaments.map((tournament) => (
                                    <TournamentCard key={tournament.id} t={tournament} translations={t} />
                                ))}
                            </div>
                        </div>
                    </DrunkModeConditional>

                    <DrunkModeConditional show="drunk">
                        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-6)' }}>
                            <Link
                                href="/tournaments/archive"
                                style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--color-text-dim)',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                {completedTournaments.length} {t('archivedTournaments')}
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </DrunkModeConditional>
                </>
            )}
        </div>
    );
}

function TournamentCard({ t, planned, translations }: { t: any; planned?: boolean; translations: (key: string) => string }) {
    const isActive = t.status === 'ACTIVE';
    const isLobby = t.status === 'PLANNED' && !planned;

    const borderStyle = isLobby
        ? '2px solid var(--color-lobby-border)'
        : isActive
        ? '1px solid var(--color-primary)'
        : '1px solid var(--color-border)';

    const shadowStyle = isLobby
        ? '0 0 20px var(--color-lobby-light)'
        : isActive
        ? '0 0 20px rgba(190, 35, 213, 0.15)'
        : 'none';

    const badgeBg = isLobby
        ? 'var(--color-lobby-light)'
        : isActive
        ? 'var(--color-primary)'
        : planned
        ? 'rgba(8,145,178,0.09)'
        : 'var(--color-surface-hover)';

    const badgeColor = isLobby
        ? 'var(--color-lobby)'
        : isActive
        ? 'white'
        : planned
        ? 'var(--color-secondary)'
        : 'var(--color-text-dim)';

    const badgeBorder = isLobby
        ? '1px solid var(--color-lobby-border)'
        : planned
        ? '1px solid rgba(8,145,178,0.25)'
        : 'none';

    const badgeLabel = isLobby ? translations('lobby') : isActive ? translations('live') : planned ? translations('planned') : translations('ended');

    const arrowColor = isLobby
        ? 'var(--color-lobby)'
        : isActive
        ? 'var(--color-primary)'
        : planned
        ? 'var(--color-secondary)'
        : 'var(--color-text)';

    return (
        <Link href={`/tournaments/${t.id}`} className="glass-panel card-interactive" style={{
            padding: 'var(--spacing-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
            textDecoration: 'none',
            color: 'inherit',
            border: borderStyle,
            boxShadow: shadowStyle,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <h3 style={{ fontSize: '1.5rem', lineHeight: 1.2, color: 'var(--color-text)', fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>{t.name}</h3>
                <span style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: badgeBg,
                    color: badgeColor,
                    border: badgeBorder,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                }}>
                    {badgeLabel}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                    <Calendar size={16} />
                    <span>{format(new Date(t.date), 'dd. MMM yyyy, HH:mm', { locale: de })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                    <MapPin size={16} />
                    <span>{t.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                    <Gamepad2 size={16} />
                    <span>{getTournamentTypeLabel(t.type)}</span>
                </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 'var(--spacing-4)', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    color: arrowColor,
                    fontSize: '0.85rem', fontWeight: 600,
                }}>
                    {translations('goTo')} <ArrowRight size={16} />
                </div>
            </div>
        </Link>
    );
}
