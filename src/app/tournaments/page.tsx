import { getTournaments } from '@/app/actions/tournaments';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Gamepad2, Plus, Users } from 'lucide-react';
import { getTournamentTypeLabel } from '@/lib/tournament-utils';

export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
    const allTournaments = await getTournaments();

    // Lobby = PLANNED and date is today or in the past (happening now / imminent)
    // Geplant = PLANNED and date is tomorrow or later
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const lobbyTournaments = allTournaments.filter(t => t.status === 'PLANNED' && new Date(t.date) <= todayEnd);
    const plannedTournaments = allTournaments.filter(t => t.status === 'PLANNED' && new Date(t.date) > todayEnd);
    const activeTournaments = allTournaments.filter(t => t.status === 'ACTIVE');
    const completedTournaments = allTournaments.filter(t => t.status === 'COMPLETED');

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-8)' }}>
                <div>
                    <h1 className="title-display" style={{ fontSize: '2rem' }}>Turniere</h1>
                    <p className="subtitle" style={{ fontSize: '0.9rem' }}>Alle Events auf einen Blick</p>
                </div>
                <Link href="/tournaments/new" className="btn btn-primary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} /> <span>Neues Turnier</span>
                </Link>
            </div>

            {/* Lobbies — happening today */}
            {lobbyTournaments.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-12)' }}>
                    <h2 className="section-header" style={{ color: 'var(--color-lobby)' }}>
                        <span className="live-dot" style={{ background: 'var(--color-lobby)' }} /> OFFENE LOBBYS
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-6)' }}>
                        {lobbyTournaments.map((t) => (
                            <TournamentCard key={t.id} t={t} />
                        ))}
                    </div>
                </div>
            )}

            {/* Planned — future date */}
            {plannedTournaments.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-12)' }}>
                    <h2 className="section-header">
                        GEPLANT
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-6)' }}>
                        {plannedTournaments.map((t) => (
                            <TournamentCard key={t.id} t={t} planned />
                        ))}
                    </div>
                </div>
            )}

            {/* Active Tournaments */}
            {activeTournaments.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-12)' }}>
                    <h2 className="section-header" style={{ color: 'var(--color-primary)' }}>
                        <span className="live-dot" style={{ background: 'var(--color-primary)' }} /> LIVE
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-6)' }}>
                        {activeTournaments.map((t) => (
                            <TournamentCard key={t.id} t={t} />
                        ))}
                    </div>
                </div>
            )}

            {/* Archive Grid */}
            {completedTournaments.length > 0 && (
                <div>
                    <h2 className="section-header">ARCHIV</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-6)', opacity: 0.8 }}>
                        {completedTournaments.map((t) => (
                            <TournamentCard key={t.id} t={t} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TournamentCard({ t, planned }: { t: any; planned?: boolean }) {
    const isActive = t.status === 'ACTIVE';
    const isLobby = t.status === 'PLANNED' && !planned;
    const isCompleted = t.status === 'COMPLETED';

    // Header gradient by status
    const headerGradient = isActive
        ? 'linear-gradient(135deg, #5048e5 0%, #818cf8 100%)'
        : isLobby
        ? 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)'
        : isCompleted
        ? 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)'
        : 'linear-gradient(135deg, #0891b2 0%, #38bdf8 100%)';

    const badgeLabel = isLobby ? '● LOBBY' : isActive ? '● LIVE' : planned ? 'GEPLANT' : 'BEENDET';
    const badgeBg = isLobby ? '#16a34a' : isActive ? '#5048e5' : isCompleted ? '#64748b' : '#0891b2';

    const ctaLabel = isActive ? 'Live Score ansehen' : isLobby ? 'Lobby beitreten' : isCompleted ? 'Ergebnisse ansehen' : 'Details & Anmeldung';
    const ctaPrimary = isActive || isLobby;

    const participantCount = t._count?.participants ?? 0;

    return (
        <Link href={`/tournaments/${t.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="card-interactive" style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.06)',
            }}>
                {/* Gradient Header */}
                <div style={{ position: 'relative', height: isActive ? '120px' : '80px', background: headerGradient }}>
                    <span style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'rgba(255,255,255,0.95)', color: badgeBg,
                        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em',
                        padding: '3px 8px', borderRadius: 'var(--radius-full)',
                    }}>
                        {badgeLabel}
                    </span>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px', lineHeight: 1.3 }}>
                        {t.name}
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '14px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} />
                            {format(new Date(t.date), 'dd. MMM', { locale: de })}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Gamepad2 size={13} />
                            {t.mode === 'TEAM' ? 'Team 2v2' : 'Solo 1v1'}
                        </span>
                        {participantCount > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Users size={13} />
                                {participantCount} Spieler
                            </span>
                        )}
                    </div>

                    {/* CTA Button */}
                    <div style={{
                        width: '100%', padding: '10px',
                        textAlign: 'center', borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem', fontWeight: 600,
                        background: ctaPrimary ? 'var(--color-primary)' : 'var(--color-primary-light)',
                        color: ctaPrimary ? '#fff' : 'var(--color-primary)',
                    }}>
                        {ctaLabel}
                    </div>
                </div>
            </div>
        </Link>
    );
}
