import { getAllTournaments, getPlannedTournaments, getRegisteredPlayers } from '@/app/actions/admin';
import { Trophy, Calendar, Users } from 'lucide-react';
import { AdminTournamentManager } from './AdminTournamentManager';
import { StatusBadge, StatusButton, DeleteButton } from './StatusButton';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function AdminTournamentsPage() {
    const [allResult, plannedResult, playersResult] = await Promise.all([
        getAllTournaments(),
        getPlannedTournaments(),
        getRegisteredPlayers(),
    ]);

    const allTournaments = allResult.success ? allResult.tournaments ?? [] : [];
    const plannedTournaments = plannedResult.success ? plannedResult.tournaments ?? [] : [];
    const players = playersResult.success ? playersResult.players ?? [] : [];

    const t = await getTranslations('admin.tournaments');

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-8)' }}>
            <header>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>{t('title')}</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>{allTournaments.length} {t('total')}</p>
            </header>

            {/* All tournaments overview */}
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={18} color="var(--color-primary)" />
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{t('overview')}</h2>
                </div>

                {allTournaments.length === 0 ? (
                    <p style={{ padding: 'var(--spacing-6)', color: 'var(--color-text-dim)', textAlign: 'center' }}>{t('none')}</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('title')}</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datum</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('players')}</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('changeStatus')}</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTournaments.map((t, i) => (
                                    <tr key={t.id} style={{ borderBottom: i < allTournaments.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>
                                            <Link href={`/tournaments/${t.id}`} style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.9rem' }}>
                                                {t.name}
                                            </Link>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                                                {t.host?.name ?? '—'} · {t.mode === 'TEAM' ? '2v2' : '1v1'}{t.isRanked ? ' · Liga' : ' · Spaß'}
                                            </div>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontSize: '0.85rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
                                            {format(new Date(t.date), 'dd.MM.yy HH:mm', { locale: de })}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                                <Users size={13} />
                                                {t._count.participants}
                                            </div>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>
                                            <StatusBadge status={t.status} />
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>
                                            <StatusButton tournamentId={t.id} currentStatus={t.status} />
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>
                                            <DeleteButton tournamentId={t.id} tournamentName={t.name} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* RSVP Manager */}
            <div className="card" style={{ maxWidth: '700px' }}>
                <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-2)' }}>
                    <Calendar size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                    {t('addPlayer')}
                </h2>
                <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-6)', fontSize: '0.9rem' }}>
                    {t('addPlayerHint')}
                </p>
                {plannedTournaments.length === 0 ? (
                    <p style={{ color: 'var(--color-text-dim)' }}>{t('noPlanned')}</p>
                ) : (
                    <AdminTournamentManager tournaments={plannedTournaments} players={players} />
                )}
            </div>
        </div>
    );
}
