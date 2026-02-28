import { getPendingUsers } from '@/app/actions/admin';
import ApprovalsClient from './approvals-client';

export default async function ApprovalsPage() {
    const result = await getPendingUsers();
    const users = result.success ? result.users : [];

    return (
        <div>
            <h1 className="title-gradient" style={{ marginBottom: 'var(--spacing-6)' }}>
                Account-Anfragen
            </h1>

            {users.length === 0 ? (
                <div className="glass-panel" style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                    Keine offenen Anfragen.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                    {users.map(user => (
                        <div
                            key={user.id}
                            className="glass-panel"
                            style={{
                                padding: 'var(--spacing-4) var(--spacing-5)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-4)',
                                flexWrap: 'wrap',
                            }}
                        >
                            {/* Avatar placeholder */}
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: 'var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                color: 'var(--color-text-dim)',
                                flexShrink: 0,
                            }}>
                                {(user.name ?? user.email ?? '?')[0].toUpperCase()}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>{user.name ?? '—'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{user.email}</div>
                            </div>

                            <ApprovalsClient userId={user.id} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
