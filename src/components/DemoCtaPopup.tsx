'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DemoCtaPopup() {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 60_000);
        return () => clearTimeout(timer);
    }, []);

    if (!visible || dismissed) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 'calc(var(--spacing-8) + 60px)', // above bottom nav
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 'min(360px, calc(100vw - 2rem))',
        }}>
            <div className="glass-panel" style={{
                padding: 'var(--spacing-6)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-3)',
                boxShadow: '0 8px 32px rgba(190, 35, 213, 0.15)',
                border: '1px solid rgba(190, 35, 213, 0.2)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                        Enjoying it?
                    </p>
                    <button
                        onClick={() => setDismissed(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
                <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                    Host your own Beer Pong instance — free, open source, one command setup.
                </p>
                <Link
                    href="https://github.com/Zidans-Haare/beer-pong"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ textAlign: 'center', fontSize: '0.85rem', textDecoration: 'none' }}
                    onClick={() => setDismissed(true)}
                >
                    Self-host your own instance →
                </Link>
                <Link
                    href="/demo/wizard"
                    className="btn btn-secondary"
                    style={{ textAlign: 'center', fontSize: '0.8rem', textDecoration: 'none' }}
                    onClick={() => setDismissed(true)}
                >
                    See the setup wizard in action
                </Link>
            </div>
        </div>
    );
}
