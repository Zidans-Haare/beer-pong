'use client';

import { updatePlayer } from '@/app/actions/players';
import { Player } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EditPlayerForm({ player }: { player: Player }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function clientAction(formData: FormData) {
        setLoading(true);
        const res = await updatePlayer(player.id, formData);
        setLoading(false);

        if (res.success) {
            router.push(`/players/${player.id}`);
            router.refresh();
        } else {
            alert('Fehler: ' + res.error);
        }
    }

    return (
        <form action={clientAction} className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'grid', gap: 'var(--spacing-4)' }}>
            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Name *</label>
                <input type="text" name="name" defaultValue={player.name} required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Spitzname</label>
                <input type="text" name="nickname" defaultValue={player.nickname || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Email (für Benachrichtigungen)</label>
                <input type="email" name="email" defaultValue={player.email || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Profilbild</label>
                    {player.image && <div style={{ fontSize: '0.8rem', marginBottom: '4px', color: 'var(--color-primary)' }}>Aktuelles Bild vorhanden</div>}
                    <input type="file" name="image" accept="image/*" style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Motto</label>
                    <input type="text" name="motto" defaultValue={player.motto || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
                </div>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Über mich</label>
                <textarea name="bio" rows={4} defaultValue={player.bio || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Speichere...' : 'Speichern'}
                </button>
                <button type="button" onClick={() => router.back()} className="btn btn-secondary">
                    Abbrechen
                </button>
            </div>
        </form>
    );
}
