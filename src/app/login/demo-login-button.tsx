'use client';

import { demoLogin } from '@/app/actions/auth';
import { useTransition } from 'react';

export default function DemoLoginButton() {
    const [isPending, startTransition] = useTransition();

    return (
        <div style={{ marginBottom: 'var(--spacing-4)' }}>
            <form action={() => startTransition(() => demoLogin())}>
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary"
                    style={{
                        width: '100%',
                        fontSize: '1rem',
                        padding: 'var(--spacing-4)',
                        background: 'linear-gradient(90deg, var(--color-primary), #f59e0b)',
                        color: '#000',
                        fontWeight: 700,
                    }}
                >
                    {isPending ? 'Wird geladen…' : '🍺 Demo ausprobieren — kein Login nötig'}
                </button>
            </form>
            <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.8rem', marginTop: 'var(--spacing-2)' }}>
                Vorgeseedete Daten · täglich zurückgesetzt
            </p>
        </div>
    );
}
