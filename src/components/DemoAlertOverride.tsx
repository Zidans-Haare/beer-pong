'use client';

import { useEffect, useState } from 'react';
import { Zap, X } from 'lucide-react';

export default function DemoAlertOverride() {
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const original = window.alert;
        window.alert = (_msg?: unknown) => {
            setMessage(String(_msg ?? ''));
        };
        return () => { window.alert = original; };
    }, []);

    if (!message) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={() => setMessage(null)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-xl)',
                    padding: '28px 28px 24px',
                    maxWidth: '380px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Zap size={18} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)', marginBottom: '2px' }}>
                                Demo Mode
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                Funktion nicht verfügbar
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setMessage(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-dim)',
                            padding: '2px',
                            flexShrink: 0,
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>
                    Dies ist eine Demo-Instanz. Für diese Funktion ist ein eigenes Deployment notwendig.
                </p>

                {/* Close button */}
                <button
                    className="btn btn-primary"
                    onClick={() => setMessage(null)}
                    style={{ width: '100%', justifyContent: 'center' }}
                >
                    Alles klar
                </button>
            </div>
        </div>
    );
}
