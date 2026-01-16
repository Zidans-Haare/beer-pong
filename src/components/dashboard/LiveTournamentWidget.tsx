import { prisma } from '@/lib/prisma';
import Link from 'next/link';

async function getActiveTournament() {
    const tournament = await prisma.tournament.findFirst({
        where: { status: 'ACTIVE' },
        include: {
            matches: {
                where: { winnerId: null }, // Only active matches
                include: { player1: true, player2: true },
                take: 4, // Show max 4 pending matches
            }
        },
        orderBy: { date: 'desc' }
    });
    return tournament;
}

export default async function LiveTournamentWidget() {
    const activeTournament = await getActiveTournament();

    if (!activeTournament) {
        return (
            <div className="glass-panel" style={{ padding: 'var(--spacing-6)', position: 'relative', overflow: 'hidden' }}>
                <div className="widget-header">
                    <span className="widget-title">Live Tournament</span>
                </div>
                <div style={{ padding: 'var(--spacing-8) 0', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                    <p style={{ marginBottom: 'var(--spacing-4)' }}>Kein aktives Turnier.</p>
                    <Link href="/tournaments" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                        Turnier Starten
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', position: 'relative', overflow: 'hidden' }}>
            {/* Background Glow */}
            <div style={{ position: 'absolute', top: -50, right: -50, width: 100, height: 100, background: 'var(--color-primary)', filter: 'blur(60px)', opacity: 0.2 }} />

            <div className="widget-header">
                <span className="widget-title">Live Tournament</span>
                <div className="live-badge">
                    <div className="live-dot" /> LIVE
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-2)' }}>
                    {activeTournament.name}
                </div>

                {activeTournament.matches.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                        Matches werden vorbereitet...
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                        {activeTournament.matches.map((match) => (
                            <div key={match.id} style={{
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                    {match.player1?.name || 'TBD'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>VS</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                    {match.player2?.name || 'TBD'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', justifyContent: 'center' }}>
                    <Link href={`/tournaments/${activeTournament.id}`} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }}>
                        Zum Turnier
                    </Link>
                </div>
            </div>
        </div>
    );
}
