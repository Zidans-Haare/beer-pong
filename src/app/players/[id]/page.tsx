import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { deletePlayer } from '@/app/actions/players';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { isAdmin } from '@/lib/admin';
import { getPlayerPaceStats, formatDuration } from '@/lib/duration';
import { Pencil, Shirt } from 'lucide-react';
import Avatar from '@/components/Avatar';
import PaceStatsWidget from '@/components/PaceStatsWidget';
import { getTranslations } from 'next-intl/server';
import FigureStage from '@/components/figure/FigureStage';
import { normalizeFigure } from '@/lib/figure';
import MiniGameProfile from '@/components/game/MiniGameProfile';
import { getMiniGameProfile } from '@/lib/minigame/stats-server';

export const dynamic = 'force-dynamic';

import { auth } from '@/auth';

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    // Awaiting params is required in newer Next.js versions for dynamic routes
    const { id } = await params;
    const session = await auth();
    const t = await getTranslations('players');

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
    const miniGame = await getMiniGameProfile(player.id);

    return (
        <div className="container page-content">
            <Link href="/players" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
                &larr; {t('back')}
            </Link>

            <header className="profile-header">
                <div className="profile-identity">
                    <Avatar
                        src={player.image ? `${player.image}?v=3` : null}
                        name={player.name}
                        size={80}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h1 style={{ marginBottom: 'var(--spacing-2)', fontSize: '2.25rem' }}>{player.name}</h1>
                        {player.motto && <p style={{ fontStyle: 'italic', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-2)' }}>&quot;{player.motto}&quot;</p>}
                    </div>
                </div>

                {session?.user && <AdminDeleteButton id={player.id} type="Player" deleteAction={deletePlayer} />}
            </header>

            {/* Knöpfe nebeneinander unter dem Kopf, damit sie auch auf dem Handy in einer Zeile stehen */}
            {(session?.user?.id === player.userId || isAdmin(session?.user?.email)) && (
                <div className="profile-actions">
                    <Link href={`/players/${player.id}/edit`} className="btn btn-secondary profile-action">
                        <Pencil size={14} aria-hidden="true" /> {t('editProfile')}
                    </Link>
                    {session?.user?.id === player.userId && (
                        <Link href={`/players/${player.id}/figure`} className="btn btn-secondary profile-action">
                            <Shirt size={14} aria-hidden="true" /> {t('myFigure')}
                        </Link>
                    )}
                </div>
            )}

            {/* Die Figur des Spielers tanzt auf seinem Profil */}
            {/* nur, wenn der Spieler seine Figur gestaltet hat */}
            {normalizeFigure(player.figure) && (
                <section className="profile-figure" aria-label={t('figureLabel', { name: player.name })}>
                    <FigureStage name={player.name} figure={normalizeFigure(player.figure)} />
                </section>
            )}

            {/* Stats Grid */}
            <div className="profile-stats">
                <StatBox label={t('wins')} value={matchesWon} />
                <StatBox label={t('games')} value={matchesPlayed} />
                <StatBox label={t('winRate')} value={`${winRate}%`} />
            </div>

            {/* Minispiel: Gesamt, gegen den Computer, Duelle, direkter Vergleich */}
            <MiniGameProfile profile={miniGame} own={session?.user?.id === player.userId} />

            {/* Pace Stats */}
            {paceStats.totalMatches > 0 && <PaceStatsWidget paceStats={paceStats} />}

            {/* Bio */}
            {player.bio && (
                <div style={{ width: '100%', marginTop: 'var(--spacing-6)', padding: 'var(--spacing-4)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-2)' }}>{t('aboutMe')}</h3>
                    <p style={{ lineHeight: 1.6 }}>{player.bio}</p>
                </div>
            )}

            {/* Tournament History */}
            <h2 className="title-gradient" style={{ marginTop: 'var(--spacing-12)', marginBottom: 'var(--spacing-6)' }}>{t('tournamentHistory')}</h2>
            <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                {player.tournaments.map((tp: any) => (
                    <Link key={tp.tournament.id} href={`/tournaments/${tp.tournament.id}`} style={{ textDecoration: 'none' }}>
                        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tp.tournament.name}</h3>
                                <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                                    {tp.tournament.date ? format(new Date(tp.tournament.date), 'MM/dd/yyyy HH:mm', { locale: enUS }) : t('unknownDate')}
                                </p>
                            </div>
                            <span style={{ fontSize: '2rem' }}>&rarr;</span>
                        </div>
                    </Link>
                ))}
                {player.tournaments.length === 0 && <p style={{ color: 'var(--color-text-dim)' }}>{t('noTournaments')}</p>}
            </div>
        </div>
    );
}

function StatBox({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="profile-stat">
            <div className="score" style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}>{value}</div>
            <div className="eyebrow" style={{ margin: '8px 0 0' }}>{label}</div>
        </div>
    );
}
