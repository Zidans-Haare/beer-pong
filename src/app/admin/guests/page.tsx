import { getGuestPlayers } from '@/app/actions/admin';
import { UserX, Clock } from 'lucide-react';
import { GuestDeleteButton, CleanupButton } from './actions-client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminGuestsPage() {
    const result = await getGuestPlayers();
    const guests = result.success ? result.guests ?? [] : [];

    const now = new Date();
    const expiredGuests = guests.filter(g => new Date(g.expiresAt) < now);

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-3)' }}>
                <div>
                    <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>Gast-Spieler</h1>
                    <p style={{ color: 'var(--color-text-dim)' }}>
                        {guests.length} gesamt · {expiredGuests.length} abgelaufen
                    </p>
                </div>
                <CleanupButton expiredCount={expiredGuests.length} />
            </header>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {guests.length === 0 ? (
                    <p style={{ padding: 'var(--spacing-6)', color: 'var(--color-text-dim)', textAlign: 'center' }}>
                        Keine Gast-Spieler vorhanden.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Turnier</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Erstellt</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Läuft ab</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {guests.map((g, i) => {
                                    const isExpired = new Date(g.expiresAt) < now;
                                    return (
                                        <tr key={g.id} style={{ borderBottom: i < guests.length - 1 ? '1px solid var(--color-border)' : 'none', opacity: isExpired ? 0.6 : 1 }}>
                                            <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <UserX size={14} color="var(--color-text-dim)" />
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.name}</span>
                                                    {isExpired && (
                                                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '99px', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700 }}>
                                                            ABGELAUFEN
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontSize: '0.85rem' }}>
                                                <Link href={`/tournaments/${g.tournament.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                                                    {g.tournament.name}
                                                </Link>
                                            </td>
                                            <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontSize: '0.82rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
                                                {format(new Date(g.createdAt), 'dd.MM.yy HH:mm', { locale: de })}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: isExpired ? '#f87171' : 'var(--color-text-dim)' }}>
                                                    <Clock size={12} />
                                                    {format(new Date(g.expiresAt), 'dd.MM.yy HH:mm', { locale: de })}
                                                </div>
                                            </td>
                                            <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>
                                                <GuestDeleteButton guestId={g.id} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
