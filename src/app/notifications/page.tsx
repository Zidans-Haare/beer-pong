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
import { Settings, CheckCircle, Trash2, Bell, Radio, ShieldCheck, ShieldAlert, Send, Trophy, Mic, Megaphone } from 'lucide-react';
import NotificationSettingsDialog from '@/components/NotificationSettingsDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('notifications');
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
            alert(t('enabled'));
        } catch (error) {
            console.error("Push Error", error);
            alert(t('error'));
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
        if (!confirm(t('confirmDeleteRead'))) return;
        setNotifications(prev => prev.filter(n => !n.isRead));
        await deleteAllReadNotifications();
    };

    return (
        <div className="container page-content" style={{ paddingBottom: '100px', paddingTop: 'var(--spacing-6)' }}>

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
                        <h1 className="title-display" style={{ fontSize: "2rem" }}>{t('title')}</h1>
                        <p className="subtitle" style={{ fontSize: '0.9rem' }}>{t('subtitle')}</p>
                    </div>

                    {/* Desktop-only (Optional, but user wanted them under heading anyway) */}
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="icon-button"
                        aria-label={t('settings')}
                        data-tooltip={t('settings')}
                    >
                        <Settings size={22} />
                    </button>

                    <button
                        onClick={handleMarkAllRead}
                        className="btn btn-secondary"
                        title={t('markAllReadTitle')}
                    >
                        <CheckCircle size={18} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t('markAllRead')}</span>
                    </button>
                </div>
            </div>

            {/* Diagnostic Panel */}
            <div className="glass-panel" style={{ padding: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)', display: 'grid', gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 'var(--spacing-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {pushStatus === 'granted' ? <ShieldCheck size={18} color="#08754b" /> : <ShieldAlert size={18} color={pushStatus === 'denied' ? '#ef4444' : '#eab308'} />}
                    <span style={{ fontSize: '0.85rem' }}>
                        Push Status: <strong>{pushStatus === 'granted' ? t('pushGranted') : pushStatus === 'denied' ? t('pushDenied') : t('pushDefault')}</strong>
                    </span>
                </div>
                {pushStatus === 'granted' && (
                    <button
                        onClick={async () => {
                            const res = await sendTestPush();
                            if (res.success) alert(t('testPushSent'));
                            else alert(t('testPushError') + res.error);
                        }}
                        className="nav-link"
                        style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                    >
                        <Send size={14} /> {t('sendTestPush')}
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
                            background: "var(--color-primary-light)",
                            borderColor: "rgba(40,100,122,0.3)"
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                            <div style={{ padding: '10px', background: "rgba(40,100,122,0.2)", borderRadius: '50%', color: "#28647a" }}>
                                <Radio size={24} className="animate-pulse" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>{t('enableLiveUpdates')}</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{t('enableLiveSubtitle')}</p>
                            </div>
                            <button
                                onClick={enablePushNotifications}
                                className="btn btn-primary"
                                style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                            >
                                {t('enable')}
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
                    <span>{t('noMessages')}</span>
                </div>
            ) : (
                <AnimatePresence mode="popLayout">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                        {notifications.map((notification, index) => {
                            const isTournament = notification.type === 'TOURNAMENT' || notification.type === 'NEW_TOURNAMENTS';
                            const isLive = notification.type === 'LIVE_TICKER';
                            const isUpdate = notification.type === 'UPDATE';

                            let IconComponent = Bell;
                            let iconColor = 'var(--color-text-dim)';
                            let borderColor = 'transparent';

                            if (isTournament) {
                                IconComponent = Trophy;
                                iconColor = '#eab308'; // yellow-500
                                borderColor = 'rgba(234,179,8,0.3)';
                            } else if (isLive) {
                                IconComponent = Mic;
                                iconColor = '#ef4444'; // red-500
                                borderColor = 'rgba(239,68,68,0.3)';
                            } else if (isUpdate) {
                                IconComponent = Megaphone;
                                iconColor = "#28647a"; // blue-500
                                borderColor = "rgba(40,100,122,0.3)";
                            }

                            return (
                                <motion.div
                                    key={notification.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.18 }}
                                    onClick={() => handleRead(notification.id, notification.link)}
                                    className="glass-panel"
                                    style={{
                                        position: 'relative',
                                        padding: 'var(--spacing-4)',
                                        display: 'flex',
                                        gap: 'var(--spacing-4)',
                                        cursor: 'pointer',
                                        borderLeft: !notification.isRead ? `4px solid ${isLive ? '#ef4444' : isTournament ? '#eab308' : "#28647a"}` : '1px solid var(--color-border)',
                                        opacity: notification.isRead ? 0.6 : 1,
                                        transition: 'all 0.2s',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '2px', color: iconColor }}>
                                        <IconComponent size={24} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <h3 style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '1.25rem', minWidth: 0, overflowWrap: 'anywhere' }}>
                                                {notification.title}
                                            </h3>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
                                                {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', lineHeight: 1.5 }}>
                                            {notification.message}
                                        </p>
                                    </div>

                                    <button
                                        onClick={(e) => handleDelete(e, notification.id)}
                                        className="icon-button"
                                        aria-label={t('delete')}
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
