'use client';

import { updatePlayer } from '@/app/actions/players';
import { Player } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ProfileImagePicker from '@/components/ProfileImagePicker';

export default function EditPlayerForm({ player }: { player: Player }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [imageData, setImageData] = useState<string | null>(player.image);
    const [name, setName] = useState(player.name);

    async function clientAction(formData: FormData) {
        setLoading(true);

        // Add image data to form if it was changed
        if (imageData !== player.image) {
            formData.set('imageData', imageData || '');
        }

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
            {/* Profile Image Picker */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-4)' }}>
                <ProfileImagePicker
                    currentImage={imageData}
                    name={name}
                    onImageChange={setImageData}
                    size={140}
                />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Name *</label>
                <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }}
                />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Spitzname</label>
                <input type="text" name="nickname" defaultValue={player.nickname || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Email (für Benachrichtigungen)</label>
                <input type="email" name="email" defaultValue={player.email || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Motto</label>
                <input type="text" name="motto" defaultValue={player.motto || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
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
