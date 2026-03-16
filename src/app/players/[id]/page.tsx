import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { deletePlayer } from '@/app/actions/players';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { isAdmin } from '@/lib/admin';
import { getPlayerPaceStats } from '@/lib/duration';
import { Pencil, ArrowLeft, Flame, Trophy, Target, Activity } from 'lucide-react';
import Avatar from '@/components/Avatar';
import PaceStatsWidget from '@/components/PaceStatsWidget';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
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
    const matchesLost = matchesPlayed - matchesWon;
    const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;

    const paceStats = await getPlayerPaceStats(player.id);
    const canEdit = session?.user?.id === player.userId || isAdmin(session?.user?.email);

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            {/* Back */}
            <div style={{ padding: 'var(--spacing-4) 0' }}>
                <Link href="/players" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-dim)', fontSize: '0.9rem', fontWeight: 500 }}>
                    <ArrowLeft size={16} /> Alle Spieler
                </Link>
            </div>

            {/* Profile Hero */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--spacing-6) 0', gap: 'var(--spacing-3)' }}>
                {/* Avatar */}
                <div style={{ position: 'relative' }}>
                    <div style={{
                        width: '112px', height: '112px', borderRadius: '50%',
                        border: '4px solid rgba(80,72,229,0.12)',
                        overflow: 'hidden',
                    }}>
                        <Avatar src={player.image ? `${player.image}?v=3` : null} name={player.name} size={112} />
                    </div>
                    {canEdit && (
                        <Link href={`/players/${player.id}/edit`} style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'var(--color-primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '3px solid var(--color-bg)',
                            boxShadow: 'var(--shadow-md)',
                        }}>
                            <Pencil size={14} />
                        </Link>
                    )}
                </div>

                {/* Name + motto */}
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>{player.name}</h1>
                    {player.motto && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '4px', fontStyle: 'italic' }}>
                            &quot;{player.motto}&quot;
                        </p>
                    )}
                </div>

                {/* Admin delete */}
                {session?.user && (
                    <div style={{ marginTop: '4px' }}>
                        <AdminDeleteButton id={player.id} type="Player" deleteAction={deletePlayer} />
                    </div>
                )}
            </div>

            {/* Stats 2×2 Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-6)' }}>
                <StatBox label="Winrate" value={`${winRate}%`} primary icon={<Target size={16} />} />
                <StatBox label="Siege" value={matchesWon} icon={<Trophy size={16} />} />
                <StatBox label="Niederlagen" value={matchesLost} icon={<Activity size={16} />} />
                <StatBox label="Spiele" value={matchesPlayed} icon={<Flame size={16} />} />
            </div>

            {/* Bio */}
            {player.bio && (
                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-subtle)', marginBottom: '8px' }}>Über mich</h3>
                    <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', lineHeight: 1.6 }}>{player.bio}</p>
                </div>
            )}

            {/* Pace Stats */}
            {paceStats.totalMatches > 0 && <PaceStatsWidget paceStats={paceStats} />}

            {/* Tournament History */}
            <div style={{ marginTop: 'var(--spacing-6)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--spacing-4)' }}>
                    Turnier-Historie
                </h2>
                {player.tournaments.length === 0 ? (
                    <p style={{ color: 'var(--color-text-subtle)', fontSize: '0.9rem' }}>Noch keine Turniere gespielt.</p>
                ) : (
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        {player.tournaments.map((tp: any, idx: number) => (
                            <Link key={tp.tournament.id} href={`/tournaments/${tp.tournament.id}`} style={{ textDecoration: 'none' }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '14px 16px',
                                    borderBottom: idx < player.tournaments.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    transition: 'background 0.15s',
                                }}>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>{tp.tournament.name}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                                            {tp.tournament.date ? format(new Date(tp.tournament.date), 'dd. MMM yyyy', { locale: de }) : ''}
                                        </p>
                                    </div>
                                    <span style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>›</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatBox({ label, value, primary, icon }: { label: string; value: string | number; primary?: boolean; icon?: React.ReactNode }) {
    return (
        <div style={{
            background: 'var(--color-surface)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--color-text-subtle)' }}>
                {icon}
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: primary ? 'var(--color-primary)' : 'var(--color-text)', lineHeight: 1 }}>
                {value}
            </p>
        </div>
    );
}
