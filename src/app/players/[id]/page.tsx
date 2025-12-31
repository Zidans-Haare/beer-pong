import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { deletePlayer } from '@/app/actions/players';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { isAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

import { auth } from '@/auth';

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    // Awaiting params is required in newer Next.js versions for dynamic routes
    const { id } = await params;
    const session = await auth();

    const player = await prisma.player.findUnique({
        where: { id },
        include: {
            tournaments: true,
            matchesAsPlayer1: { where: { winnerId: { not: null } }, include: { tournament: true } },
            matchesAsPlayer2: { where: { winnerId: { not: null } }, include: { tournament: true } },
        }
    });

    if (!player) notFound();

    const matchesWon = player.matchesAsPlayer1.filter(m => m.winnerId === player.id).length +
        player.matchesAsPlayer2.filter(m => m.winnerId === player.id).length;
    const matchesPlayed = player.matchesAsPlayer1.length + player.matchesAsPlayer2.length;
    const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;

    return (
        <div className="container">
            <Link href="/players" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
                &larr; Zurück zur Übersicht
            </Link>

            <div className="glass-panel" style={{ padding: 'var(--spacing-8)', marginBottom: 'var(--spacing-8)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-8)', alignItems: 'center' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold' }}>
                        {player.image ? <img src={player.image} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : player.name[0]}
                    </div>
                    <div>
                        <h1 className="title-gradient" style={{ marginBottom: 'var(--spacing-2)' }}>{player.name}</h1>
                        {player.motto && <p style={{ fontStyle: 'italic', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-2)' }}>"{player.motto}"</p>}

                        {(session?.user?.id === player.userId || isAdmin(session?.user?.email)) && (
                            <Link href={`/players/${player.id}/edit`} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                                ✏️ Profil bearbeiten
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
                {player.tournaments.map((tournament: any) => (
                    <Link key={tournament.id} href={`/tournaments/${tournament.id}`} style={{ textDecoration: 'none' }}>
                        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tournament.name}</h3>
                                <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>{format(new Date(tournament.date), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
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
