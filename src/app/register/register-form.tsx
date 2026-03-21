'use client';

import { registerUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function RegisterForm() {
    const t = useTranslations('auth');
    const router = useRouter();
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);

    async function handleSubmit(formData: FormData) {
        const res = await registerUser(formData);
        if (res.success) {
            if (res.pending) {
                setPending(true);
            } else {
                router.refresh();
                router.push('/');
            }
        } else {
            setError(res.error || t('registrationError'));
        }
    }

    if (pending) {
        return (
            <div className="glass-panel" style={{ padding: 'var(--spacing-8)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <div style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-text-dim)', display: 'flex', justifyContent: 'center' }}>
                    <Clock size={40} strokeWidth={1.5} />
                </div>
                <h2 style={{ marginBottom: 'var(--spacing-4)' }}>{t('accountCreated')}</h2>
                <p style={{ color: 'var(--color-text-dim)', lineHeight: 1.6 }}>
                    {t('notified')}
                </p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-8)', width: '100%', maxWidth: '400px' }}>
            <h1 className="title-gradient" style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>{t('register')}</h1>
            <form action={handleSubmit}>
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>{t('name')}</label>
                    <input name="name" type="text" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
                </div>
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>{t('email')}</label>
                    <input name="email" type="email" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
                </div>
                <div style={{ marginBottom: 'var(--spacing-6)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>{t('password')}</label>
                    <input name="password" type="password" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
                </div>

                <div style={{ marginBottom: 'var(--spacing-6)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            required
                            style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            {t('acceptRules')} <a href="/rules" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{t('rules')}</a>
                        </span>
                    </label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{t('createAccount')}</button>

                {error && <p style={{ color: 'var(--color-error)', marginTop: 'var(--spacing-4)', textAlign: 'center' }}>{error}</p>}
            </form>
        </div>
    );
}
