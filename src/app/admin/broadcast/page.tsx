'use client';

import { useState } from 'react';
import { sendManualBroadcast } from '@/app/actions/notifications';
import { Send, Bell, Megaphone, Trophy, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BroadcastPage() {
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (formData: FormData) => {
        setStatus('sending');
        const res = await sendManualBroadcast(formData);

        if (res.success) {
            setStatus('success');
            const count = 'count' in res ? res.count : 0;
            setMessage(`Nachricht gesendet! (${count} Empfänger)`);
        } else {
            setStatus('error');
            setMessage(res.error || 'Fehler beim Senden');
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel"
                style={{ padding: 'var(--spacing-6)' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
                    <div style={{
                        padding: '12px',
                        background: 'rgba(59,130,246,0.2)',
                        borderRadius: '50%',
                        color: '#60a5fa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Bell size={24} />
                    </div>
                    <div>
                        <h1 className="text-gradient" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
                            Broadcast Senden
                        </h1>
                        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>Nachricht an alle Nutzer senden</p>
                    </div>
                </div>

                <form action={handleSubmit} style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '8px' }}>Titel</label>
                        <input
                            name="title"
                            required
                            placeholder="z.B. Neue Features!"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-text)',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '8px' }}>Nachricht</label>
                        <textarea
                            name="message"
                            required
                            rows={4}
                            placeholder="Deine Nachricht hier..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-text)',
                                outline: 'none',
                                resize: 'vertical',
                                minHeight: '100px'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '8px' }}>Link (Optional)</label>
                        <input
                            name="link"
                            placeholder="z.B. /tournaments/abc-123"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-text)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '8px' }}>Typ</label>
                        <select
                            name="type"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-text)',
                                outline: 'none'
                            }}
                        >
                            <option value="UPDATE">Update (Allgemein)</option>
                            <option value="TOURNAMENT">Turnier Info</option>
                            <option value="SYSTEM">System</option>
                            <option value="GENERIC">Sonstiges</option>
                        </select>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '8px' }}>
                            Nur Nutzer, die diesen Benachrichtigungstyp aktiviert haben, erhalten die Nachricht.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'sending'}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            marginTop: 'var(--spacing-2)',
                            opacity: status === 'sending' ? 0.7 : 1,
                            cursor: status === 'sending' ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {status === 'sending' ? 'Sende...' : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Send size={18} />
                                Broadcast Senden
                            </span>
                        )}
                    </button>

                    {status === 'success' && (
                        <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                            {message}
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                            {message}
                        </div>
                    )}
                </form>
            </motion.div>
        </div>
    );
}
