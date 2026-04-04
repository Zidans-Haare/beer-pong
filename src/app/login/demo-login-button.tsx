'use client';

import { demoLogin } from '@/app/actions/auth';
import { useTransition } from 'react';

export default function DemoLoginButton() {
    const [isPending, startTransition] = useTransition();

    return (
        <div style={{ marginBottom: 'var(--spacing-6)', textAlign: 'center' }}>
            <form action={() => startTransition(() => demoLogin())}>
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary"
                    style={{
                        width: '100%',
                        fontSize: '1.05rem',
                        padding: 'var(--spacing-4) var(--spacing-6)',
                        fontWeight: 700,
                    }}
                >
                    {isPending ? 'Loading…' : 'Try the Demo'}
                </button>
            </form>
            <p style={{
                color: 'var(--color-text-dim)',
                fontSize: '0.78rem',
                marginTop: 'var(--spacing-2)',
                letterSpacing: '0.02em',
            }}>
                No account needed · Data resets daily
            </p>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-4)',
                margin: 'var(--spacing-6) 0 0',
            }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>or sign in</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>
        </div>
    );
}
