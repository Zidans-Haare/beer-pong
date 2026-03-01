import { prisma } from '@/lib/prisma';
import { revokePasskey } from '@/app/actions/admin';
import { KeyRound } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import RevokeButton from './revoke-button';

export const dynamic = 'force-dynamic';

export default async function AdminPasskeysPage() {
    const passkeys = await prisma.passkey.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header>
                <h1 className="title-display" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>Passkeys</h1>
                <p style={{ color: 'var(--color-text-dim)' }}>{passkeys.length} registrierte Passkeys</p>
            </header>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {passkeys.length === 0 ? (
                    <p style={{ padding: 'var(--spacing-6)', color: 'var(--color-text-dim)', textAlign: 'center' }}>
                        Keine Passkeys vorhanden.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    {['Benutzer', 'Name', 'Gerät', 'Erstellt', 'Zuletzt genutzt', ''].map(h => (
                                        <th key={h} style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {passkeys.map((pk, i) => (
                                    <tr key={pk.id} style={{ borderBottom: i < passkeys.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{pk.user.name ?? '—'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{pk.user.email}</div>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontSize: '0.85rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text)' }}>
                                                <KeyRound size={13} color="var(--color-primary)" />
                                                {pk.friendlyName ?? 'Passkey'}
                                            </div>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontSize: '0.82rem', color: 'var(--color-text-dim)' }}>
                                            {pk.credentialDeviceType === 'multiDevice' ? 'Multi-Gerät' : 'Einzel-Gerät'}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontSize: '0.82rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
                                            {format(new Date(pk.createdAt), 'dd.MM.yy', { locale: de })}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontSize: '0.82rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
                                            {pk.lastUsedAt ? format(new Date(pk.lastUsedAt), 'dd.MM.yy', { locale: de }) : '—'}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }}>
                                            <RevokeButton passkeyId={pk.id} userName={pk.user.name ?? 'diesen User'} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
