'use client';

import { useId, useState, useTransition } from 'react';
import { Pencil, Check, Search } from 'lucide-react';
import { adminUpdatePlayer } from '@/app/actions/admin';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { useTranslations } from 'next-intl';
import SheetDialog from '@/components/SheetDialog';

type Player = {
    id: string;
    name: string;
    nickname: string | null;
    bio: string | null;
    image: string | null;
    _count: { matchesAsPlayer1: number; matchesAsPlayer2: number };
};

export default function PlayersClient({ players }: { players: Player[] }) {
    const t = useTranslations('admin.players');
    const fieldId = useId();
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Player | null>(null);
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [bio, setBio] = useState('');
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    const filtered = players.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.nickname?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );

    function openEdit(p: Player) {
        setEditing(p);
        setName(p.name);
        setNickname(p.nickname ?? '');
        setBio(p.bio ?? '');
        setError('');
    }

    function handleSave() {
        if (!editing) return;
        setError('');
        startTransition(async () => {
            const res = await adminUpdatePlayer(editing.id, { name, nickname, bio });
            if (res.success) {
                setEditing(null);
            } else {
                setError(res.error ?? t('saveError'));
            }
        });
    }

    return (
        <>
            {/* Search */}
            <div style={{ position: 'relative', maxWidth: '380px', marginBottom: 'var(--spacing-5)' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)', pointerEvents: 'none' }} />
                <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.9rem' }}
                />
            </div>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {filtered.length === 0 ? (
                    <p style={{ padding: 'var(--spacing-6)', color: 'var(--color-text-dim)', textAlign: 'center' }}>{t('noPlayersFound')}</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: "0" }}>{t('colPlayer')}</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: "0" }}>{t('colGames')}</th>
                                    <th style={{ padding: 'var(--spacing-3) var(--spacing-4)' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p, i) => {
                                    const total = p._count.matchesAsPlayer1 + p._count.matchesAsPlayer2;
                                    return (
                                        <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                            <td style={{ padding: 'var(--spacing-3) var(--spacing-4)' }} data-label={t('colPlayer')}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Avatar src={p.image} name={p.name} size={36} />
                                                    <div>
                                                        <Link href={`/players/${p.id}`} style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', textDecoration: 'none' }}>
                                                            {p.name}
                                                        </Link>
                                                        {p.nickname && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>{p.nickname}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', fontSize: '0.85rem', color: 'var(--color-text-dim)' }} data-label={t('colGames')}>
                                                {total}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-3) var(--spacing-4)', textAlign: 'right' }} data-label="">
                                                <button
                                                    onClick={() => openEdit(p)}
                                                    title={t('editTitle')}
                                                    className="icon-button"
                                                    aria-label={`${t('editTitle')}: ${p.name}`}
                                                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', cursor: 'pointer', color: 'var(--color-text-dim)', display: 'inline-flex' }}
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editing && (
                <SheetDialog title={t('editPlayer')} onClose={() => { if (!isPending) setEditing(null); }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <div>
                                <label htmlFor={`${fieldId}-name`} className="form-label">Name *</label>
                                <input
                                    id={`${fieldId}-name`}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.95rem' }}
                                />
                            </div>
                            <div>
                                <label htmlFor={`${fieldId}-nickname`} className="form-label">Nickname</label>
                                <input
                                    id={`${fieldId}-nickname`}
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                    placeholder="optional"
                                    style={{ width: '100%', padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.95rem' }}
                                />
                            </div>
                            <div>
                                <label htmlFor={`${fieldId}-bio`} className="form-label">Bio</label>
                                <textarea
                                    id={`${fieldId}-bio`}
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    rows={3}
                                    placeholder="optional"
                                    style={{ width: '100%', padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
                                />
                            </div>

                            {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

                            <div className="sheet-actions">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    disabled={isPending}
                                    className="btn btn-secondary"
                                    style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-dim)' }}
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isPending || !name.trim()}
                                    className="btn btn-primary"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isPending ? 0.6 : 1 }}
                                >
                                    <Check size={15} />
                                    {isPending ? t('saving') : t('save')}
                                </button>
                            </div>
                        </div>
                </SheetDialog>
            )}
        </>
    );
}
