'use client';

import { useState, useEffect } from 'react';
import { getUsers, resetUserPassword, deleteUser } from '@/app/actions/admin';
import { Search, Key, Trash2 } from 'lucide-react';

type User = {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    _count: { hostedTournaments: number };
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [password, setPassword] = useState('');
    const [resetStatus, setResetStatus] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        setLoading(true);
        const res = await getUsers();
        if (res.success && res.users) {
            setUsers(res.users);
        }
        setLoading(false);
    }

    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase().includes(search.toLowerCase()) || '') ||
        (user.email?.toLowerCase().includes(search.toLowerCase()) || '')
    );

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setResetStatus('loading');
        const res = await resetUserPassword(selectedUser.id, password);

        if (res.success) {
            setResetStatus('success');
            setTimeout(() => {
                setSelectedUser(null);
                setPassword('');
                setResetStatus(null);
            }, 1500);
        } else {
            setResetStatus(res.error || 'Fehler');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Sicher, dass du diesen User löschen willst?')) return;
        await deleteUser(userId);
        loadUsers();
    };

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
            <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <div>
                    <h1 className="title-display" style={{ fontSize: '2rem' }}>Benutzerverwaltung</h1>
                    <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>{users.length} Benutzer registriert</p>
                </div>

                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} size={18} />
                    <input
                        type="text"
                        placeholder="Suchen..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field"
                        style={{
                            width: '100%',
                            paddingLeft: '40px',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 40px',
                            color: 'var(--color-text)'
                        }}
                    />
                </div>
            </header>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: 'var(--spacing-4)' }}>User</th>
                                <th style={{ padding: 'var(--spacing-4)' }}>Statistik</th>
                                <th style={{ padding: 'var(--spacing-4)', textAlign: 'right' }}>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={3} style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-text-dim)' }}>Lade User...</td></tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: 'var(--spacing-4)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                background: 'var(--gradient-primary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden', fontWeight: 'bold'
                                            }}>
                                                {user.image ? <img src={user.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user.name?.[0] || '?')}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{user.name}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-4)', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                                        {user._count.hostedTournaments} Turniere gehostet
                                    </td>
                                    <td style={{ padding: 'var(--spacing-4)', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                style={{ padding: '8px', color: 'var(--color-text-dim)', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}
                                                title="Passwort ändern"
                                            >
                                                <Key size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                style={{ padding: '8px', color: 'var(--color-error)', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)' }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Password Reset Modal */}
            {selectedUser && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 'var(--spacing-4)', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: 'var(--spacing-6)' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: 'var(--spacing-2)' }}>Passwort Reset</h3>
                        <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-6)' }}>Neues Passwort für <span style={{ color: 'var(--color-secondary)' }}>{selectedUser.name}</span> vergeben.</p>

                        <form onSubmit={handleResetPassword} style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                            <input
                                type="text"
                                placeholder="Neues Passwort eingeben"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                                    color: 'white', fontSize: '1rem'
                                }}
                                autoFocus
                            />

                            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedUser(null)}
                                    style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.1)' }}
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={!password || resetStatus === 'loading'}
                                    className="btn-primary" // Reuse global class
                                    style={{ flex: 1, borderRadius: 'var(--radius-sm)' }}
                                >
                                    {resetStatus === 'loading' ? 'Speichere...' :
                                        resetStatus === 'success' ? 'Erledigt!' : 'Speichern'}
                                </button>
                            </div>

                            {resetStatus && resetStatus !== 'loading' && resetStatus !== 'success' && (
                                <p style={{ color: 'var(--color-error)', textAlign: 'center', fontSize: '0.9rem' }}>{resetStatus}</p>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
