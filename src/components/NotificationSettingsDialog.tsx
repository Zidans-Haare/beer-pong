'use client';

import { useState, useEffect } from 'react';
import { updateNotificationPreferences, getNotificationPreferences } from '@/app/actions/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Trophy, AlertCircle, Radio } from 'lucide-react';

const Toggle = ({ active, onChange }: { active: boolean, onChange: (v: boolean) => void }) => (
    <button
        type="button"
        onClick={() => onChange(!active)}
        style={{
            width: '48px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '999px',
            padding: '4px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: active ? 'var(--gradient-primary)' : 'rgba(0, 0, 0, 0.08)',
            boxShadow: active ? 'var(--shadow-glow-primary)' : 'none',
            position: 'relative',
        }}
    >
        <motion.div
            animate={{ x: active ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
                background: 'white',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
        />
    </button>
);

export default function NotificationSettingsDialog({ onClose }: { onClose: () => void }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [prefs, setPrefs] = useState({
        notifyNewTournaments: true,
        notifyUpdates: true,
        notifyLiveTicker: true
    });

    useEffect(() => {
        getNotificationPreferences().then(data => {
            if (data) {
                setPrefs({
                    notifyNewTournaments: data.notifyNewTournaments ?? true,
                    notifyUpdates: data.notifyUpdates ?? true,
                    notifyLiveTicker: data.notifyLiveTicker ?? true
                });
            }
            setLoading(false);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const formData = new FormData();
        if (prefs.notifyNewTournaments) formData.append('notifyNewTournaments', 'on');
        if (prefs.notifyUpdates) formData.append('notifyUpdates', 'on');
        if (prefs.notifyLiveTicker) formData.append('notifyLiveTicker', 'on');

        await updateNotificationPreferences(formData);
        setSaving(false);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 'var(--spacing-4)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: '450px',
                    padding: 0,
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* Decorative Accent Line */}
                <div style={{
                    height: '2px',
                    width: '100%',
                    background: 'var(--gradient-primary)'
                }} />

                <div style={{ padding: 'var(--spacing-8)' }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            padding: '8px',
                            color: 'var(--color-text-dim)',
                            backgroundColor: 'var(--color-surface-hover)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-text)';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-dim)';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                    >
                        <X size={18} />
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 'var(--spacing-8)' }}>
                        <div style={{
                            padding: 'var(--spacing-3)',
                            background: 'rgba(80, 72, 229, 0.08)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-3)',
                            border: '1px solid rgba(80, 72, 229, 0.2)'
                        }}>
                            <Settings size={28} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <h2 className="title-display" style={{ fontSize: '1.5rem', marginBottom: '4px', color: '#1d1d1f' }}>
                            Einstellungen
                        </h2>
                        <p className="subtitle" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Verwalte deine Benachrichtigungen</p>
                    </div>

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
                                        borderRadius: '12px',
                                        color: '#eab308',
                                        border: '1px solid rgba(234, 179, 8, 0.2)'
                                    }}>
                                        <Trophy size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>Neue Turniere</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Infos zu neuen Events.</div>
                                    </div>
                                    <Toggle
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
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '12px',
                                        color: '#3b82f6',
                                        border: '1px solid rgba(59, 130, 246, 0.2)'
                                    }}>
                                        <AlertCircle size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>Wichtige Updates</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Änderungen & News.</div>
                                    </div>
                                    <Toggle
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
                                        borderRadius: '12px',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.2)'
                                    }}>
                                        <Radio size={20} className="animate-pulse-subtle" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>Live Ticker</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Echtzeit Match-Updates.</div>
                                    </div>
                                    <Toggle
                                        active={prefs.notifyLiveTicker}
                                        onChange={(v) => setPrefs({ ...prefs, notifyLiveTicker: v })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-4)' }}>
                                <button
                                    type="button"
                                    onClick={onClose}
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
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary"
                                    style={{
                                        flex: 2,
                                        padding: '14px',
                                        opacity: saving ? 0.7 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {saving ? 'Speichert...' : 'Speichern'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
