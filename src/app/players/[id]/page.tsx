import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { deletePlayer } from '@/app/actions/players';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { isAdmin } from '@/lib/admin';
import { getPlayerPaceStats, formatDuration } from '@/lib/duration';
import { Pencil, Zap, Timer, Hourglass, Coffee } from 'lucide-react';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

import { auth } from '@/auth';

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    // Awaiting params is required in newer Next.js versions for dynamic routes
    const { id } = await params;
    const session = await auth();

    const player = await prisma.player.findUnique({
        where: { id },
        include: {
            tournaments: {
                include: { tournament: true },
                orderBy: { tournament: { date: 'desc' } }
            },
            matchesAsPlayer1: { where: { winnerId: { not: null } }, include: { tournament: true } },
            matchesAsPlayer2: { where: { winnerId: { not: null } }, include: { tournament: true } },
        }
    });

    if (!player) notFound();

    const matchesWon = player.matchesAsPlayer1.filter(m => m.winnerId === player.id).length +
        player.matchesAsPlayer2.filter(m => m.winnerId === player.id).length;
    const matchesPlayed = player.matchesAsPlayer1.length + player.matchesAsPlayer2.length;
    const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;

    // Get pace stats for duration tracking
    const paceStats = await getPlayerPaceStats(player.id);

    return (
        <div className="container">
            <Link href="/players" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
                &larr; Zurück zur Übersicht
            </Link>

            <div className="glass-panel" style={{ padding: 'var(--spacing-8)', marginBottom: 'var(--spacing-8)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-8)', alignItems: 'center' }}>
                    <Avatar
                        src={player.image ? `${player.image}?v=3` : null}
                        name={player.name}
                        size={100}
                    />
                    <div>
                        <h1 className="title-gradient" style={{ marginBottom: 'var(--spacing-2)' }}>{player.name}</h1>
                        {player.motto && <p style={{ fontStyle: 'italic', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-2)' }}>"{player.motto}"</p>}

                        {(session?.user?.id === player.userId || isAdmin(session?.user?.email)) && (
                            <Link href={`/players/${player.id}/edit`} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Pencil size={14} /> Profil bearbeiten
                            </Link>
                        )}
                    </div>
                </div>

                {session?.user && <AdminDeleteButton id={player.id} type="Player" deleteAction={deletePlayer} />}
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-4)', width: '100%', marginTop: 'var(--spacing-4)' }}>
                <StatBox label="Siege" value={matchesWon} />
                <StatBox label="Spiele" value={matchesPlayed} />
                <StatBox label="Win Rate" value={`${winRate}%`} />
            </div>

            {/* Pace Stats */}
            {paceStats.totalMatches > 0 && (
                <div style={{ marginTop: 'var(--spacing-6)', width: '100%' }}>
                    {(() => {
                        const paceIconMap: Record<string, typeof Timer> = { Blitzschnell: Zap, Schnellspieler: Timer, Normal: Hourglass, Genießer: Coffee };
                        const PaceIcon = paceIconMap[paceStats.paceLabel] ?? Timer;
                        return (
                    <h3 style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                        <PaceIcon size={18} /> Spieltempo
                    </h3>
                        );
                    })()}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-4)' }}>
                        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                {paceStats.paceLabel}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-1)' }}>
                                Spielstil
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-secondary)' }}>
                                {formatDuration(paceStats.averageDuration)}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-1)' }}>
                                Avg. Spielzeit
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
                        <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4ECDC4' }}>
                                {formatDuration(paceStats.fastestMatch)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Schnellster</div>
                        </div>
                        <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FF6B6B' }}>
                                {formatDuration(paceStats.slowestMatch)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Längster</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bio */}
            {player.bio && (
                <div style={{ width: '100%', marginTop: 'var(--spacing-6)', padding: 'var(--spacing-4)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-2)' }}>Über mich</h3>
                    <p style={{ lineHeight: 1.6 }}>{player.bio}</p>
                </div>
            )}

            {/* Tournament History */}
            <h2 className="title-gradient" style={{ marginTop: 'var(--spacing-12)', marginBottom: 'var(--spacing-6)' }}>Turnier Historie</h2>
            <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                {player.tournaments.map((tp: any) => (
                    <Link key={tp.tournament.id} href={`/tournaments/${tp.tournament.id}`} style={{ textDecoration: 'none' }}>
                        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tp.tournament.name}</h3>
                                <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                                    {tp.tournament.date ? format(new Date(tp.tournament.date), 'dd.MM.yyyy HH:mm', { locale: de }) : 'Datum unbekannt'}
                                </p>
                            </div>
                            <span style={{ fontSize: '2rem' }}>&rarr;</span>
                        </div>
                    </Link>
                ))}
                {player.tournaments.length === 0 && <p style={{ color: 'var(--color-text-dim)' }}>Noch keine Turniere gespielt.</p>}
            </div>
        </div>
    );
}

function StatBox({ label, value }: { label: string, value: string | number }) {
    return (
        <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{value}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
        </div>
    );
}
