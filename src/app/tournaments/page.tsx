import { getTournaments } from '@/app/actions/tournaments';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
    const allTournaments = await getTournaments();

    // Sort: Active/Planned first, then Completed
    const activeTournaments = allTournaments.filter(t => t.status !== 'COMPLETED');
    const completedTournaments = allTournaments.filter(t => t.status === 'COMPLETED');

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-8)' }}>
                <h1 className="title-gradient" style={{ fontSize: 'var(--font-size-3xl)' }}>Turniere</h1>
                <Link href="/tournaments/new" className="btn btn-primary">
                    + Neues Turnier
                </Link>
            </div>

            {/* Active / Planned */}
            <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-4)', color: 'white' }}>Aktuell</h2>
            <div style={{ display: 'grid', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-12)' }}>
                {activeTournaments.length === 0 ? (
                    <p style={{ color: 'var(--color-text-dim)', fontStyle: 'italic' }}>Keine aktuellen Turniere.</p>
                ) : (
                    activeTournaments.map((t) => (
                        <TournamentCard key={t.id} t={t} />
                    ))
                )}
            </div>

            {/* Archive */}
            {completedTournaments.length > 0 && (
                <>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-4)', color: 'var(--color-text-dim)' }}>Archiv</h2>
                    <div style={{ display: 'grid', gap: 'var(--spacing-4)', opacity: 0.7 }}>
                        {completedTournaments.map((t) => (
                            <TournamentCard key={t.id} t={t} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function TournamentCard({ t }: { t: any }) {
    return (
        <Link href={`/tournaments/${t.id}`} className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <div>
                <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-1)', color: 'var(--color-primary)' }}>{t.name}</h3>
                <div style={{ display: 'flex', gap: 'var(--spacing-4)', color: 'var(--color-text-dim)', fontSize: 'var(--font-size-sm)' }}>
                    <span>📅 {format(new Date(t.date), 'PPP p', { locale: de })}</span>
                    <span>📍 {t.location}</span>
                    <span>🎮 {t.type}</span>
                </div>
            </div>
            <div>
                <span style={{
                    padding: '4px 12px',
                    borderRadius: '99px',
                    background: t.status === 'ACTIVE' ? 'var(--color-success)' : (t.status === 'COMPLETED' ? 'var(--color-text-dim)' : 'rgba(255,255,255,0.1)'),
                    color: t.status === 'ACTIVE' ? 'black' : 'white',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                }}>
                    {t.status === 'COMPLETED' ? 'BEENDET' : t.status}
                </span>
            </div>
        </Link>
    );
}
