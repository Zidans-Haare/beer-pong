'use client';

import { useState, useEffect } from 'react';
import { updateNotificationPreferences, getNotificationPreferences } from '@/app/actions/notifications';
import { motion } from 'framer-motion';
import { Trophy, AlertCircle, Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';
import SheetDialog from './SheetDialog';

const Toggle = ({ active, onChange, label, disabled }: { active: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) => (
    <button
        type="button"
        className="preference-switch"
        role="switch"
        aria-checked={active}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!active)}
    >
        <span className="preference-switch-track" style={{ background: active ? 'var(--color-primary)' : 'var(--color-border-strong)' }}>
        <motion.div
            animate={{ x: active ? 20 : 0 }}
            transition={{ duration: 0.14 }}
            style={{
                background: 'white',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                boxShadow: "none"
            }}
        />
        </span>
    </button>
);

export default function NotificationSettingsDialog({ onClose }: { onClose: () => void }) {
    const t = useTranslations('notifications');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [prefs, setPrefs] = useState({
        notifyNewTournaments: true,
        notifyUpdates: true,
        notifyLiveTicker: true
    });

    useEffect(() => {
        let active = true;
        getNotificationPreferences().then(data => {
            if (!active) return;
            if (data) {
                setPrefs({
                    notifyNewTournaments: data.notifyNewTournaments ?? true,
                    notifyUpdates: data.notifyUpdates ?? true,
                    notifyLiveTicker: data.notifyLiveTicker ?? true
                });
            }
            setLoading(false);
        }).catch(() => {
            if (!active) return;
            setError(t('error'));
            setLoading(false);
        });
        return () => { active = false; };
    }, [t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const formData = new FormData();
        if (prefs.notifyNewTournaments) formData.append('notifyNewTournaments', 'on');
        if (prefs.notifyUpdates) formData.append('notifyUpdates', 'on');
        if (prefs.notifyLiveTicker) formData.append('notifyLiveTicker', 'on');

        setError('');
        try {
            const result = await updateNotificationPreferences(formData);
            if (!result.success) {
                setError(result.error || t('error'));
                return;
            }
            onClose();
        } catch {
            setError(t('error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <SheetDialog title={t('settings')} onClose={() => { if (!saving) onClose(); }}>
                    <p className="form-help" style={{ marginBottom: '20px' }}>{t('manageNotifications')}</p>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-12)' }}>
                            <div className="animate-spin" style={{ width: '32px', height: '32px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                {/* Tournament Toggle */}
                                <div style={{
                                    padding: 'var(--spacing-4)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-surface-hover)',
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-4)'
                                }}>
                                    <div style={{
                                        padding: '10px',
                                        background: 'rgba(234, 179, 8, 0.1)',
                                        borderRadius: "6px",
                                        color: '#eab308',
                                        border: '1px solid rgba(234, 179, 8, 0.2)'
                                    }}>
                                        <Trophy size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>{t('newTournaments')}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{t('newTournamentsDesc')}</div>
                                    </div>
                                    <Toggle
                                        label={t('newTournaments')}
                                        disabled={saving}
                                        active={prefs.notifyNewTournaments}
                                        onChange={(v) => setPrefs({ ...prefs, notifyNewTournaments: v })}
                                    />
                                </div>

                                {/* Updates Toggle */}
                                <div style={{
                                    padding: 'var(--spacing-4)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-surface-hover)',
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-4)'
                                }}>
                                    <div style={{
                                        padding: '10px',
                                        background: "rgba(40,100,122,0.1)",
                                        borderRadius: "6px",
                                        color: "#28647a",
                                        border: "1px solid rgba(40,100,122,0.2)"
                                    }}>
                                        <AlertCircle size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>{t('importantUpdates')}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{t('importantUpdatesDesc')}</div>
                                    </div>
                                    <Toggle
                                        label={t('importantUpdates')}
                                        disabled={saving}
                                        active={prefs.notifyUpdates}
                                        onChange={(v) => setPrefs({ ...prefs, notifyUpdates: v })}
                                    />
                                </div>

                                {/* Live Ticker Toggle */}
                                <div style={{
                                    padding: 'var(--spacing-4)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-surface-hover)',
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-4)'
                                }}>
                                    <div style={{
                                        padding: '10px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: "6px",
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.2)'
                                    }}>
                                        <Radio size={20} className="animate-pulse-subtle" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>Live Ticker</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{t('liveTickerDesc')}</div>
                                    </div>
                                    <Toggle
                                        label="Live Ticker"
                                        disabled={saving}
                                        active={prefs.notifyLiveTicker}
                                        onChange={(v) => setPrefs({ ...prefs, notifyLiveTicker: v })}
                                    />
                                </div>
                            </div>

                            {error && <p className="form-error" role="alert">{error}</p>}
                            <div className="sheet-actions">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={saving}
                                    className="btn btn-secondary"
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--color-surface-hover)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-dim)',
                                        fontWeight: 700,
                                        fontSize: '0.9rem'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                        e.currentTarget.style.color = 'var(--color-text)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.color = 'var(--color-text-dim)';
                                    }}
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary"
                                    style={{
                                        flex: 2,
                                        padding: '14px',
                                        opacity: saving ? 0.7 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {saving ? t('saving') : t('save')}
                                </button>
                            </div>
                        </form>
                    )}
        </SheetDialog>
    );
}
