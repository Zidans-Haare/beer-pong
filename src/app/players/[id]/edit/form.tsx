'use client';

import { updatePlayer } from '@/app/actions/players';
import { Player } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ProfileImagePicker from '@/components/ProfileImagePicker';
import { useTranslations } from 'next-intl';

export default function EditPlayerForm({ player, demoMode = false }: { player: Player; demoMode?: boolean }) {
    const t = useTranslations('players');
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
            alert(t('error') + res.error);
        }
    }

    return (
        <form action={clientAction} className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'grid', gap: 'var(--spacing-4)' }}>
            {/* Profile Image Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--spacing-4)', gap: 'var(--spacing-2)' }}>
                <ProfileImagePicker
                    currentImage={imageData}
                    name={name}
                    onImageChange={setImageData}
                    size={140}
                />
                {demoMode && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textAlign: 'center', maxWidth: '260px' }}>
                        {t('demoImageHint')}
                    </p>
                )}
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
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>{t('nickname')}</label>
                <input type="text" name="nickname" defaultValue={player.nickname || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>{t('emailNotif')}</label>
                <input type="email" name="email" defaultValue={player.email || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>{t('motto')}</label>
                <input type="text" name="motto" defaultValue={player.motto || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>{t('bio')}</label>
                <textarea name="bio" rows={4} defaultValue={player.bio || ''} style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-4)' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? t('saving') : t('save')}
                </button>
                <button type="button" onClick={() => router.back()} className="btn btn-secondary">
                    {t('cancel')}
                </button>
            </div>
        </form>
    );
}
