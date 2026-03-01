import { getTournaments } from '@/app/actions/tournaments';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, MapPin, Gamepad2, Plus, ArrowRight } from 'lucide-react';
import { getTournamentTypeLabel } from '@/lib/tournament-utils';

export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
    const allTournaments = await getTournaments();

    // Sort: Lobbies (PLANNED) first, then Active, then Completed
    const lobbyTournaments = allTournaments.filter(t => t.status === 'PLANNED');
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

            {/* Lobbies (PLANNED) */}
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

function TournamentCard({ t }: { t: any }) {
    const isActive = t.status === 'ACTIVE';
    const isLobby = t.status === 'PLANNED';

    return (
        <Link href={`/tournaments/${t.id}`} className="glass-panel card-interactive" style={{
            padding: 'var(--spacing-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
            textDecoration: 'none',
            color: 'inherit',
            border: isLobby ? `2px solid var(--color-lobby-border)` : (isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'),
            boxShadow: isLobby ? `0 0 20px var(--color-lobby-light)` : (isActive ? '0 0 20px rgba(190, 35, 213, 0.15)' : 'none'),
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <h3 style={{ fontSize: '1.5rem', lineHeight: 1.2, color: 'var(--color-text)', fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>{t.name}</h3>
                <span style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: isLobby ? 'var(--color-lobby-light)' : (isActive ? 'var(--color-primary)' : 'var(--color-surface-hover)'),
                    color: isLobby ? 'var(--color-lobby)' : (isActive ? 'white' : 'var(--color-text-dim)'),
                    border: isLobby ? '1px solid var(--color-lobby-border)' : 'none',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    {isLobby ? 'LOBBY' : (isActive ? 'LIVE' : 'BEENDET')}
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
                    color: isLobby ? 'var(--color-lobby)' : (isActive ? 'var(--color-primary)' : 'var(--color-text)'),
                    fontSize: '0.85rem', fontWeight: 600,
                }}>
                    Zum Turnier <ArrowRight size={16} />
                </div>
            </div>
        </Link>
    );
}
