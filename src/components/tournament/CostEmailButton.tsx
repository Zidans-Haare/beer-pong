'use client';

import { useState } from 'react';
import { sendCostSummaryEmails } from '@/app/actions/cost-split';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function CostEmailButton({ tournamentId }: { tournamentId: string }) {
    const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [result, setResult] = useState<{ sent?: number; error?: string } | null>(null);

    async function handleSend() {
        if (state === 'loading') return;
        setState('loading');
        const res = await sendCostSummaryEmails(tournamentId);
        if (res.success) {
            setState('done');
            setResult({ sent: res.sent });
        } else {
            setState('error');
            setResult({ error: res.error });
        }
    }

    return (
        <div style={{
            background: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-4)',
            flexWrap: 'wrap',
        }}>
            <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px' }}>
                    Kostenabrechnung per Mail
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                    Personalisierte Übersicht an alle RSVP-Ja senden
                </div>
            </div>

            {state === 'done' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                    <CheckCircle size={16} /> {result?.sent} Mail{result?.sent !== 1 ? 's' : ''} gesendet
                </div>
            ) : state === 'error' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.85rem' }}>
                    <AlertCircle size={16} /> {result?.error}
                </div>
            ) : (
                <button
                    onClick={handleSend}
                    disabled={state === 'loading'}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                    {state === 'loading'
                        ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sende...</>
                        : <><Mail size={14} /> Kosten senden</>
                    }
                </button>
            )}
        </div>
    );
}
