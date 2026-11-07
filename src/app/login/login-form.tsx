'use client';

import { useActionState, useId } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { authenticate } from '@/app/actions/auth';
import BiometricLoginButton from '@/components/BiometricLoginButton';
import { useTranslations } from 'next-intl';

export default function LoginForm() {
    const t = useTranslations('auth');
    const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined);
    const formId = useId();

    return (
        <div>
            <div className="auth-heading"><div className="eyebrow">BIER PONG</div><h1>Login</h1></div>

            {/* Biometric Login - Primary Option */}
            <BiometricLoginButton />

            {/* Divider */}
            <div className="auth-divider">{t('loginWithEmail')}</div>

            {/* Traditional Login Form */}
            <form action={dispatch} className="form-stack">
                <div className="form-field">
                    <label className="form-label" htmlFor={`${formId}-email`}>{t('email')}</label>
                    <input id={`${formId}-email`} name="email" type="email" autoComplete="username" autoCapitalize="none" required />
                </div>

                <div className="form-field">
                    <label className="form-label" htmlFor={`${formId}-password`}>{t('password')}</label>
                    <input id={`${formId}-password`} name="password" type="password" autoComplete="current-password" required />
                </div>

                <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? <LoaderCircle size={18} className="loading-spin" /> : <ArrowRight size={18} />}{t('signIn')}</button>

                {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
            </form>

            <p className="auth-footer">
                {t('noAccount')} <a href="/register" style={{ color: 'var(--color-primary)' }}>{t('register')}</a>
            </p>
        </div>
    );
}
