'use client';

import { useActionState } from 'react';
import { authenticate } from '@/app/actions/auth';
import BiometricLoginButton from '@/components/BiometricLoginButton';
import { useTranslations } from 'next-intl';

export default function LoginForm() {
    const t = useTranslations('auth');
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-8)', width: '100%', maxWidth: '400px' }}>
            <h1 className="title-gradient" style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>Login</h1>

            {/* Biometric Login - Primary Option */}
            <BiometricLoginButton />

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', margin: 'var(--spacing-6) 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>{t('loginWithEmail')}</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>

            {/* Traditional Login Form */}
            <form action={dispatch}>
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Email</label>
                    <input name="email" type="email" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
                </div>

                <div style={{ marginBottom: 'var(--spacing-6)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>{t('password')}</label>
                    <input name="password" type="password" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{t('signIn')}</button>

                {errorMessage && <p style={{ color: 'var(--color-error)', marginTop: 'var(--spacing-4)', textAlign: 'center' }}>{errorMessage}</p>}
            </form>

            <p style={{ marginTop: 'var(--spacing-4)', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                {t('noAccount')} <a href="/register" style={{ color: 'var(--color-primary)' }}>{t('register')}</a>
            </p>
        </div>
    );
}
