'use client';

import { registerUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterForm() {
    const router = useRouter();
    const [error, setError] = useState('');

    async function handleSubmit(formData: FormData) {
        const res = await registerUser(formData);
        if (res.success) {
            // registerUser will sign in, so just refresh/push to home
            router.refresh();
            router.push('/');
        } else {
            setError(res.error || 'Fehler bei der Registrierung');
        }
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-8)', width: '100%', maxWidth: '400px' }}>
            <h1 className="title-gradient" style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>Registrieren</h1>
            <form action={handleSubmit}>
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Name</label>
                    <input name="name" type="text" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
                </div>
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Email</label>
                    <input name="email" type="email" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
                </div>
                <div style={{ marginBottom: 'var(--spacing-6)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)' }}>Passwort</label>
                    <input name="password" type="password" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }} />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Account erstellen</button>

                {error && <p style={{ color: 'var(--color-error)', marginTop: 'var(--spacing-4)', textAlign: 'center' }}>{error}</p>}
            </form>
        </div>
    );
}
