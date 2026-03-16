'use client';

import { useActionState } from 'react';
import { authenticate } from '@/app/actions/auth';
import BiometricLoginButton from '@/components/BiometricLoginButton';
import { Mail, Lock, Beer } from 'lucide-react';

export default function LoginForm() {
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);

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
                        Willkommen zurück
                    </h1>
                    <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                        Melde dich an, um fortzufahren
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <form action={dispatch} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>E-Mail</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="Deine E-Mail Adresse"
                                style={{ paddingLeft: '42px' }}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>Passwort</label>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
                            <input
                                name="password"
                                type="password"
                                required
                                placeholder="Dein Passwort"
                                style={{ paddingLeft: '42px' }}
                            />
                        </div>
                    </div>

                    {errorMessage && (
                        <p style={{ color: 'var(--color-error)', fontSize: '0.875rem', textAlign: 'center' }}>{errorMessage}</p>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '4px', padding: '14px' }}>
                        Anmelden
                    </button>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Oder</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                </div>

                {/* Passkey */}
                <BiometricLoginButton />

                {/* Register Link */}
                <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                    Noch kein Konto?{' '}
                    <a href="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Jetzt registrieren</a>
                </p>
            </div>
        </div>
    );
}
