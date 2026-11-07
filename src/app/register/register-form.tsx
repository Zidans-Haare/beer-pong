'use client';

import { registerUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { ArrowRight, Clock, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function RegisterForm() {
    const t = useTranslations('auth');
    const router = useRouter();
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const [isSubmitting, startTransition] = useTransition();
    const formId = useId();

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
            <div className="form-stack" style={{ textAlign: 'center' }} role="status">
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
        <div>
            <div className="auth-heading"><div className="eyebrow">BIER PONG</div><h1>{t('register')}</h1></div>
            <form action={formData => startTransition(() => handleSubmit(formData))} className="form-stack">
                <div className="form-field">
                    <label className="form-label" htmlFor={`${formId}-name`}>{t('name')}</label>
                    <input id={`${formId}-name`} name="name" type="text" autoComplete="name" required />
                </div>
                <div className="form-field">
                    <label className="form-label" htmlFor={`${formId}-email`}>{t('email')}</label>
                    <input id={`${formId}-email`} name="email" type="email" autoComplete="username" autoCapitalize="none" required />
                </div>
                <div className="form-field">
                    <label className="form-label" htmlFor={`${formId}-password`}>{t('password')}</label>
                    <input id={`${formId}-password`} name="password" type="password" autoComplete="new-password" required />
                </div>

                <div style={{ marginBottom: 'var(--spacing-6)' }}>
                    <label className="check-row">
                        <input
                            type="checkbox"
                            required
                            style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                            {t('acceptRules')} <a href="/rules" target="_blank" rel="noopener noreferrer">{t('rules')}</a>
                        </span>
                    </label>
                </div>

                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle size={18} className="loading-spin" /> : <ArrowRight size={18} />}{t('createAccount')}</button>

                {error && <p className="form-error" role="alert">{error}</p>}
            </form>
        </div>
    );
}
