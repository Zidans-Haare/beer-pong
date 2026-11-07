'use client';

import { useState } from 'react';
import { sendManualBroadcast } from '@/app/actions/notifications';
import { Send } from 'lucide-react';
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
        <div className="card" style={{ maxWidth: '600px' }}>
            <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-2)' }}>{t('title')}</h2>
            <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-6)' }}>{t('subtitle')}</p>

            <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
                <div className="form-group">
                    <label htmlFor="broadcast-title">{t('messageTitle')}</label>
                    <input id="broadcast-title" type="text" name="title" required className="form-control" placeholder={t('titlePlaceholder')} />
                </div>

                <div className="form-group">
                    <label htmlFor="broadcast-message">{t('message')}</label>
                    <textarea id="broadcast-message" name="message" required rows={4} className="form-control" placeholder={t('messagePlaceholder')} style={{ resize: 'vertical', minHeight: '110px', fontFamily: 'inherit' }} />
                </div>

                <div className="form-group">
                    <label htmlFor="broadcast-link">{t('linkLabel')}</label>
                    <input type="hidden" name="link" value={linkChoice === '__custom__' ? customLink : linkChoice} />
                    <select id="broadcast-link" value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)} className="form-control">
                        <option value="/">{t('linkHome')}</option>
                        <option value="/players">{t('linkPlayers')}</option>
                        <option value="/tournaments">{t('linkTournaments')}</option>
                        <option value="/stats">{t('linkStats')}</option>
                        <option value="/settings">{t('linkSettings')}</option>
                        <option value="__custom__">{t('linkCustom')}</option>
                    </select>
                    {linkChoice === '__custom__' && (
                        <input
                            type="text"
                            value={customLink}
                            onChange={(e) => setCustomLink(e.target.value)}
                            placeholder="z.B. /tournaments/abc-123"
                            aria-label={t('linkLabel')}
                            className="form-control"
                            style={{ marginTop: 'var(--spacing-2)' }}
                        />
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="broadcast-type">{t('typeLabel')}</label>
                    <select id="broadcast-type" name="type" className="form-control">
                        <option value="UPDATE">{t('typeUpdate')}</option>
                        <option value="TOURNAMENT">{t('typeTournament')}</option>
                        <option value="SYSTEM">{t('typeSystem')}</option>
                        <option value="GENERIC">{t('typeGeneric')}</option>
                    </select>
                    <small style={{ color: 'var(--color-text-dim)', marginTop: 'var(--spacing-1)', display: 'block' }}>{t('typeDesc')}</small>
                </div>

                <button type="submit" disabled={status === 'sending'} className="btn btn-primary" style={{ alignSelf: 'flex-start', minWidth: '200px' }}>
                    <Send size={18} aria-hidden="true" />
                    {status === 'sending' ? t('sending') : t('sendBroadcast')}
                </button>

                {status === 'success' && <div role="status" style={{ padding: '12px 14px', background: 'rgba(8,117,75,0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)' }}>{message}</div>}
                {status === 'error' && <div role="alert" style={{ padding: '12px 14px', background: 'rgba(214,40,30,0.08)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)' }}>{message}</div>}
            </form>
        </div>
    );
}
