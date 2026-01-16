'use client';

import { submitRSVP } from '@/app/actions/rsvp';
import { useState } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';

export default function RSVPForm({
    tournamentId,
    currentStatus,
    title = "Bist du dabei?"
}: {
    tournamentId: string;
    currentStatus?: string;
    title?: string;
}) {
    const [rulesAccepted, setRulesAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(status: string) {
        if (status === 'YES' && !rulesAccepted && currentStatus !== 'YES') {
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.set('tournamentId', tournamentId);
        formData.set('status', status);

        const res = await submitRSVP(formData);
        if (!res.success) {
            alert(res.error);
        }
        setIsSubmitting(false);
    }

    const canJoin = rulesAccepted || currentStatus === 'YES';

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-4)', fontSize: '1rem', fontWeight: 600 }}>{title}</h3>

            <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => handleSubmit('YES')}
                    disabled={!canJoin || isSubmitting}
                    style={{
                        flex: '1 1 100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: currentStatus === 'YES'
                            ? 'var(--color-success)'
                            : canJoin ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        color: currentStatus === 'YES'
                            ? 'white'
                            : canJoin ? 'var(--color-success)' : 'var(--color-text-dim)',
                        border: `1px solid ${currentStatus === 'YES' || canJoin ? 'var(--color-success)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-3)',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: canJoin ? 'pointer' : 'not-allowed',
                        opacity: !canJoin ? 0.5 : 1,
                        transition: 'all 0.2s'
                    }}
                >
                    <Check size={16} strokeWidth={currentStatus === 'YES' ? 3 : 2} />
                    {currentStatus === 'YES' ? 'Dabei' : 'Dabei'}
                </button>

                <button
                    type="button"
                    onClick={() => handleSubmit('MAYBE')}
                    disabled={isSubmitting}
                    style={{
                        flex: '1 1 100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: currentStatus === 'MAYBE' ? 'orange' : 'rgba(255, 165, 0, 0.1)',
                        color: currentStatus === 'MAYBE' ? 'white' : 'orange',
                        border: '1px solid orange',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-3)',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <HelpCircle size={16} />
                    Vielleicht
                </button>

                <button
                    type="button"
                    onClick={() => handleSubmit('NO')}
                    disabled={isSubmitting}
                    style={{
                        flex: '1 1 100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: currentStatus === 'NO' ? 'var(--color-error)' : 'rgba(255, 0, 85, 0.1)',
                        color: currentStatus === 'NO' ? 'white' : 'var(--color-error)',
                        border: '1px solid var(--color-error)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-3)',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <X size={16} />
                    Absage
                </button>
            </div>

            {currentStatus !== 'YES' && (
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    marginTop: 'var(--spacing-3)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-dim)'
                }}>
                    <input
                        type="checkbox"
                        checked={rulesAccepted}
                        onChange={(e) => setRulesAccepted(e.target.checked)}
                        style={{
                            width: '18px',
                            height: '18px',
                            accentColor: 'var(--color-primary)',
                            cursor: 'pointer'
                        }}
                    />
                    Ich akzeptiere die{' '}
                    <a
                        href="/rules"
                        target="_blank"
                        style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                    >
                        Regeln
                    </a>
                </label>
            )}
        </div>
    );
}
