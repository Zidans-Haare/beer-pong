'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { updateSeason, endSeasonAndStartNext } from '@/app/actions/seasons';

interface Props {
    current: { id: string; name: string; accentColor: string; sinceLabel: string };
    suggestedName: string;
    // Zuletzt beendete Saison, für den Hinweis bei gleicher Farbe
    previous: { name: string; accentColor: string } | null;
}

// Vorschläge für die nächste Saisonfarbe; Kontrast wird beim Anwenden automatisch abgesichert
const SWATCHES = ['#006b50', '#1d4ed8', '#7c3aed', '#c2410c', '#be123c', '#0e7490'];

function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label={label}
                    style={{ width: 44, height: 36, padding: 0, border: '1px solid var(--color-border-strong)', borderRadius: 6, background: 'none' }} />
                {SWATCHES.map(c => (
                    <button key={c} type="button" onClick={() => onChange(c)} aria-label={c}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: value.toLowerCase() === c ? '3px solid var(--color-text)' : '1px solid var(--color-border-strong)', cursor: 'pointer' }} />
                ))}
            </div>
        </div>
    );
}

export default function SeasonManager({ current, suggestedName, previous }: Props) {
    const t = useTranslations('admin.seasons');
    const [pending, startTransition] = useTransition();
    const [name, setName] = useState(current.name);
    const [color, setColor] = useState(current.accentColor);
    const [nextName, setNextName] = useState(suggestedName);
    const [nextColor, setNextColor] = useState('#1d4ed8');
    const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string; where: 'save' | 'end' } | null>(null);
    const [confirming, setConfirming] = useState(false);

    const run = (action: () => Promise<{ success: boolean; error?: string }>, okText: string, where: 'save' | 'end') => {
        setMessage(null);
        startTransition(async () => {
            const res = await action();
            if (res.success) {
                setMessage({ kind: 'ok', text: okText, where });
                // Layout (Saisonfarbe) und Daten neu laden
                window.location.reload();
            } else {
                setMessage({ kind: 'error', text: res.error ?? t('failed'), where });
                setConfirming(false);
            }
        });
    };

    const field: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '1rem' };

    return (
        <>
            <section className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'grid', gap: 'var(--spacing-4)' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{t('currentSeason')}</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{current.sinceLabel}</p>
                <div>
                    <label htmlFor="season-name" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{t('name')}</label>
                    <input id="season-name" style={field} value={name} maxLength={60} onChange={e => setName(e.target.value)} />
                </div>
                <ColorField value={color} onChange={setColor} label={t('color')} />
                {previous && previous.accentColor.toLowerCase() === color.toLowerCase() && (
                    <p role="status" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-warning)', fontWeight: 600 }}>{t('sameColorHint', { season: previous.name })}</p>
                )}
                <div>
                    <button className="btn btn-primary" disabled={pending}
                        onClick={() => run(() => updateSeason(current.id, name, color), t('saved'), 'save')}>{t('save')}</button>
                </div>
                {message?.where === 'save' && <Message message={message} />}
            </section>

            <section className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'grid', gap: 'var(--spacing-4)', borderTop: '3px solid var(--color-secondary)' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{t('endTitle')}</h2>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{t('endHint')}</p>
                <div>
                    <label htmlFor="next-name" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>{t('nextName')}</label>
                    <input id="next-name" style={field} value={nextName} maxLength={60} onChange={e => setNextName(e.target.value)} />
                </div>
                <ColorField value={nextColor} onChange={setNextColor} label={t('nextColor')} />
                {current.accentColor.toLowerCase() === nextColor.toLowerCase() && (
                    <p role="status" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-warning)', fontWeight: 600 }}>{t('sameColorHint', { season: current.name })}</p>
                )}
                {!confirming ? (
                    <div>
                        <button className="btn btn-secondary" disabled={pending} onClick={() => { setMessage(null); setConfirming(true); }}>{t('endButton')}</button>
                    </div>
                ) : (
                    <div role="alertdialog" aria-label={t('endTitle')} style={{ display: 'grid', gap: '12px', padding: '16px', border: '1px solid var(--color-secondary)', borderRadius: 6, background: 'var(--color-secondary-light)' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{t('confirmEnd', { current: current.name, next: nextName })}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" disabled={pending}
                                onClick={() => run(() => endSeasonAndStartNext(nextName, nextColor), t('ended'), 'end')}>
                                {pending ? t('working') : t('confirmYes')}
                            </button>
                            <button className="btn" disabled={pending} onClick={() => setConfirming(false)}>{t('cancel')}</button>
                        </div>
                    </div>
                )}
                {message?.where === 'end' && <Message message={message} />}
            </section>

        </>
    );
}

function Message({ message }: { message: { kind: 'ok' | 'error'; text: string } }) {
    return (
        <p role={message.kind === 'error' ? 'alert' : 'status'} style={{ margin: 0, color: message.kind === 'ok' ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
            {message.text}
        </p>
    );
}
