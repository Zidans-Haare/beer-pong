'use client';

import { registerUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Clock, User, Mail, Lock, Beer } from 'lucide-react';

export default function RegisterForm() {
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
            setError(res.error || 'Fehler bei der Registrierung');
        }
    }

    if (pending) {
        return (
            <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-6)' }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: 'var(--radius-lg)',
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow-primary)',
                }}>
                    <Clock size={36} color="#fff" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Account erstellt!</h2>
                    <p style={{ color: 'var(--color-text-dim)', lineHeight: 1.6 }}>
                        Dein Account wartet auf Admin-Freigabe. Du wirst benachrichtigt, sobald dein Zugang aktiviert wurde.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)' }}>
            {/* Logo + Heading */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: 'var(--radius-lg)',
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow-primary)',
                }}>
                    <Beer size={36} color="#fff" />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>
                        Konto erstellen
                    </h1>
                    <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                        Werde Teil der Beer Pong Community
                    </p>
                </div>
            </div>

            {/* Form */}
            <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                {/* Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>Name</label>
                    <div style={{ position: 'relative' }}>
                        <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
                        <input name="name" type="text" required placeholder="Dein Anzeigename" style={{ paddingLeft: '42px' }} />
                    </div>
                </div>

                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>E-Mail</label>
                    <div style={{ position: 'relative' }}>
                        <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
                        <input name="email" type="email" required placeholder="Deine E-Mail Adresse" style={{ paddingLeft: '42px' }} />
                    </div>
                </div>

                {/* Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>Passwort</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
                        <input name="password" type="password" required placeholder="Mindestens 8 Zeichen" style={{ paddingLeft: '42px' }} />
                    </div>
                </div>

                {/* Rules checkbox */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '4px' }}>
                    <input
                        type="checkbox"
                        required
                        style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--color-primary)', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', lineHeight: 1.5 }}>
                        Ich habe die{' '}
                        <a href="/rules" target="_blank" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Spielregeln</a>
                        {' '}gelesen und akzeptiert
                    </span>
                </label>

                {error && (
                    <p style={{ color: 'var(--color-error)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '4px', padding: '14px' }}>
                    Account erstellen
                </button>
            </form>

            <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                Bereits registriert?{' '}
                <a href="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Anmelden</a>
            </p>
        </div>
    );
}
