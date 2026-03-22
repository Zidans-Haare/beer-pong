'use client';

import { useState } from 'react';
import { sendManualBroadcast } from '@/app/actions/notifications';
import { Send, Bell, Megaphone, Trophy, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function BroadcastPage() {
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [linkChoice, setLinkChoice] = useState('/tournaments');
    const [customLink, setCustomLink] = useState('');
    const t = useTranslations('admin.broadcast');

    const handleSubmit = async (formData: FormData) => {
        setStatus('sending');
        const res = await sendManualBroadcast(formData);

        if (res.success) {
            setStatus('success');
            const count = 'count' in res ? res.count : 0;
            setMessage(`${t('sent')} (${count})`);
        } else {
            setStatus('error');
            setMessage(res.error || t('sendError'));
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
                            {t('title')}
                        </h1>
                        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>{t('subtitle')}</p>
                    </div>
                </div>

                <form action={handleSubmit} style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '8px' }}>{t('messageTitle')}</label>
                        <input
                            name="title"
                            required
                            placeholder={t('titlePlaceholder')}
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
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '8px' }}>{t('message')}</label>
                        <textarea
                            name="message"
                            required
                            rows={4}
                            placeholder={t('messagePlaceholder')}
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
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '8px' }}>{t('linkLabel')}</label>
                        <input type="hidden" name="link" value={linkChoice === '__custom__' ? customLink : linkChoice} />
                        <select
                            value={linkChoice}
                            onChange={(e) => setLinkChoice(e.target.value)}
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
                            <option value="/">{t('linkHome')}</option>
                            <option value="/players">{t('linkPlayers')}</option>
                            <option value="/tournaments">{t('linkTournaments')}</option>
                            <option value="/stats">{t('linkStats')}</option>
                            <option value="/settings">{t('linkSettings')}</option>
                            <option value="__custom__">{t('linkCustom')}</option>
                        </select>
                        {linkChoice === '__custom__' && (
                            <input
                                value={customLink}
                                onChange={(e) => setCustomLink(e.target.value)}
                                placeholder="z.B. /tournaments/abc-123"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    marginTop: '8px',
                                    background: 'var(--color-surface-hover)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--color-text)',
                                    outline: 'none'
                                }}
                            />
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-dim)', marginBottom: '8px' }}>{t('typeLabel')}</label>
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
                            <option value="UPDATE">{t('typeUpdate')}</option>
                            <option value="TOURNAMENT">{t('typeTournament')}</option>
                            <option value="SYSTEM">{t('typeSystem')}</option>
                            <option value="GENERIC">{t('typeGeneric')}</option>
                        </select>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '8px' }}>
                            {t('typeDesc')}
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
                        {status === 'sending' ? t('sending') : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Send size={18} />
                                {t('sendBroadcast')}
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
