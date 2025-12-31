'use client';

import { useFormState } from 'react-dom';
import { authenticate } from '@/app/actions/auth';

export default function LoginForm() {
    const [errorMessage, dispatch] = useFormState(authenticate, undefined);

    return (
        <form action={dispatch} className="glass-panel" style={{ padding: 'var(--spacing-8)', width: '100%', maxWidth: '400px' }}>
            <h1 className="title-gradient" style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>Login</h1>

            <div style={{ marginBottom: 'var(--spacing-4)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Email</label>
                <input name="email" type="email" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
            </div>

            <div style={{ marginBottom: 'var(--spacing-6)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Passwort</label>
                <input name="password" type="password" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Anmelden</button>

            {errorMessage && <p style={{ color: 'var(--color-error)', marginTop: 'var(--spacing-4)', textAlign: 'center' }}>{errorMessage}</p>}

            <p style={{ marginTop: 'var(--spacing-4)', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                Noch keinen Account? <a href="/register" style={{ color: 'var(--color-primary)' }}>Registrieren</a>
            </p>
        </form>
    );
}
