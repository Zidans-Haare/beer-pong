'use client';

import { useState, useEffect } from 'react';
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllReadNotifications
} from '@/app/actions/notifications';
import { saveSubscription, getVapidPublicKey, sendTestPush } from '@/app/actions/push';
import { useRouter } from 'next/navigation';
import { Settings, CheckCircle, Trash2, Bell, Radio, ShieldCheck, ShieldAlert, Send } from 'lucide-react';
import NotificationSettingsDialog from '@/components/NotificationSettingsDialog';
import { motion, AnimatePresence } from 'framer-motion';

type Notification = {
    id: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: Date;
    type: string;
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied' | 'loading'>('loading');
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);

        // Check Push Permission
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            if (Notification.permission === 'granted') {
                setPushStatus('granted');
            } else if (Notification.permission === 'denied') {
                setPushStatus('denied');
            } else {
                setPushStatus('default');
            }
        }

        return () => clearInterval(interval);
    }, []);

    const enablePushNotifications = async () => {
        if (!('serviceWorker' in navigator)) return;

        try {
            const register = await navigator.serviceWorker.register('/sw.js');
            const vapidKey = await getVapidPublicKey();

            if (!vapidKey) {
                console.error("No VAPID key found");
                alert("Push Setup Error: No Key");
                return;
            }

            const subscription = await register.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });

            await saveSubscription(subscription.toJSON());
            setPushStatus('granted');
            alert("Push-Benachrichtigungen aktiviert! 🚀");
        } catch (error) {
            console.error("Push Error", error);
            alert("Fehler beim Aktivieren der Benachrichtigungen.");
        }
    };

    const handleRead = async (id: string, link: string | null) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        await markNotificationAsRead(id);
        if (link) router.push(link);
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        await markAllNotificationsAsRead();
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setNotifications(prev => prev.filter(n => n.id !== id));
        await deleteNotification(id);
    };

    const handleDeleteAllRead = async () => {
        if (!confirm('Alle gelesenen entfernen?')) return;
        setNotifications(prev => prev.filter(n => !n.isRead));
        await deleteAllReadNotifications();
    };

    return (
        <div className="container" style={{ paddingBottom: '100px', paddingTop: 'var(--spacing-6)' }}>

            {/* Header Section matching Players Page */}
            {/* Header Section - Prepared for mobile stacking */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-4)',
                marginBottom: 'var(--spacing-8)',
                // Desktop: horizontal layout
                // We'll use a wrapper style that naturally stacks but could be side-by-side on larger screens
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="title-display" style={{ fontSize: '2rem' }}>Benachrichtigungen</h1>
                        <p className="subtitle" style={{ fontSize: '0.9rem' }}>Updates & Live Ticker</p>
                    </div>

                    {/* Desktop-only (Optional, but user wanted them under heading anyway) */}
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="glass-panel"
                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}
                    >
                        <Settings size={18} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Einstellungen</span>
                    </button>

                    <button
                        onClick={handleDeleteAllRead}
                        className="glass-panel"
                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)' }}
                        title="Gelesene löschen"
                    >
                        <Trash2 size={18} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Gelesene leeren</span>
                    </button>
                </div>
            </div>

            {/* Diagnostic Panel */}
            <div className="glass-panel" style={{ padding: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {pushStatus === 'granted' ? <ShieldCheck size={18} color="#22c55e" /> : <ShieldAlert size={18} color={pushStatus === 'denied' ? '#ef4444' : '#eab308'} />}
                    <span style={{ fontSize: '0.85rem' }}>
                        Push Status: <strong>{pushStatus === 'granted' ? 'Aktiviert' : pushStatus === 'denied' ? 'Blockiert' : 'Nicht registriert'}</strong>
                    </span>
                </div>
                {pushStatus === 'granted' && (
                    <button
                        onClick={async () => {
                            const res = await sendTestPush();
                            if (res.success) alert("Test-Push gesendet! Schau in deine OS-Mitteilungen.");
                            else alert("Fehler: " + res.error);
                        }}
                        className="nav-link"
                        style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                    >
                        <Send size={14} /> Test-Push senden
                    </button>
                )}
            </div>

            {/* Push Permission Prompt - Styled as Glass Panel */}
            <AnimatePresence>
                {pushStatus === 'default' && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="glass-panel"
                        style={{
                            marginBottom: 'var(--spacing-6)',
                            padding: 'var(--spacing-4)',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(6,182,212,0.1) 100%)',
                            borderColor: 'rgba(59,130,246,0.3)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                            <div style={{ padding: '10px', background: 'rgba(59,130,246,0.2)', borderRadius: '50%', color: '#60a5fa' }}>
                                <Radio size={24} className="animate-pulse" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontWeight: 700, color: 'white', marginBottom: '4px' }}>Live Updates aktivieren?</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>Push-Nachrichten für Ticker & Turniere empfangen.</p>
                            </div>
                            <button
                                onClick={enablePushNotifications}
                                className="btn-primary"
                                style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                            >
                                Aktivieren
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-12)', color: 'var(--color-text-dim)' }}>
                    <div className="animate-spin" style={{ width: '32px', height: '32px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="glass-panel" style={{ padding: 'var(--spacing-12)', textAlign: 'center', color: 'var(--color-text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                    <Bell size={48} style={{ opacity: 0.2 }} />
                    <span>Keine neuen Nachrichten</span>
                </div>
            ) : (
                <AnimatePresence mode="popLayout">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                        {notifications.map((notification, index) => {
                            const isTournament = notification.type === 'TOURNAMENT' || notification.type === 'NEW_TOURNAMENTS';
                            const isLive = notification.type === 'LIVE_TICKER';
                            const isUpdate = notification.type === 'UPDATE';

                            let icon = '🔔';
                            let iconColor = 'var(--color-text-dim)';
                            let borderColor = 'transparent';

                            if (isTournament) {
                                icon = '🏆';
                                iconColor = '#eab308'; // yellow-500
                                borderColor = 'rgba(234,179,8,0.3)';
                            } else if (isLive) {
                                icon = '🎙️';
                                iconColor = '#ef4444'; // red-500
                                borderColor = 'rgba(239,68,68,0.3)';
                            } else if (isUpdate) {
                                icon = '📢';
                                iconColor = '#3b82f6'; // blue-500
                                borderColor = 'rgba(59,130,246,0.3)';
                            }

                            return (
                                <motion.div
                                    key={notification.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => handleRead(notification.id, notification.link)}
                                    className="glass-panel"
                                    style={{
                                        position: 'relative',
                                        padding: 'var(--spacing-4)',
                                        display: 'flex',
                                        gap: 'var(--spacing-4)',
                                        cursor: 'pointer',
                                        borderLeft: !notification.isRead ? `4px solid ${isLive ? '#ef4444' : isTournament ? '#eab308' : '#3b82f6'}` : '1px solid var(--color-border)',
                                        opacity: notification.isRead ? 0.6 : 1,
                                        transition: 'all 0.2s',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'flex-start', paddingTop: '2px' }}>
                                        {icon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <h3 style={{ fontWeight: 700, color: 'white', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {notification.title}
                                            </h3>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
                                                {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {notification.message}
                                        </p>
                                    </div>

                                    <button
                                        onClick={(e) => handleDelete(e, notification.id)}
                                        style={{ padding: '8px', color: 'var(--color-text-dim)', opacity: 0.6 }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-dim)'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </AnimatePresence>
            )}

            {showSettings && <NotificationSettingsDialog onClose={() => setShowSettings(false)} />}
        </div>
    );
}

function urlBase64ToUint8Array(base64String: string) {
    if (!base64String) return new Uint8Array(0);

    // Remove whitespace and potential non-base64 chars
    const cleaned = base64String.trim();

    const padding = '='.repeat((4 - cleaned.length % 4) % 4);
    const base64 = (cleaned + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    try {
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (e) {
        console.error('Failed to decode VAPID key base64:', e, 'Cleaned string length:', cleaned.length);
        throw e;
    }
}
