'use client';

import { createPlayer } from '@/app/actions/players';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { User, Sparkles, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CreatePlayerForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const t = useTranslations('players');

    async function clientAction(formData: FormData) {
        setIsSubmitting(true);
        const res = await createPlayer(formData);
        setIsSubmitting(false);

        if (res.success) {
            router.push('/players');
        } else {
            alert('Fehler: ' + res.error);
        }
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', maxWidth: '500px', margin: '0 auto' }}>
            <form action={clientAction} style={{ display: 'grid', gap: 'var(--spacing-4)' }}>

                {/* Name */}
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>
                        <User size={16} /> {t('namePlaceholder')}
                    </label>
                    <input
                        type="text"
                        name="name"
                        required
                        style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }}
                        placeholder="z.B. Max Mustermann"
                    />
                </div>

                {/* Nickname */}
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>{t('nickname')}</label>
                    <input
                        type="text"
                        name="nickname"
                        style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }}
                        placeholder="z.B. The Destroyer"
                    />
                </div>

                {/* Motto */}
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>
                        <Sparkles size={16} /> {t('motto')}
                    </label>
                    <input
                        type="text"
                        name="motto"
                        style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }}
                        placeholder="z.B. Gewinnen ist alles"
                    />
                </div>

                <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', gap: 'var(--spacing-4)' }}>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="btn"
                        style={{ flex: 1, border: '1px solid var(--color-border)' }}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                        style={{ flex: 1, opacity: isSubmitting ? 0.7 : 1 }}
                    >
                        {isSubmitting ? '...' : t('create')}
                    </button>
                </div>
            </form>
        </div>
    );
}
