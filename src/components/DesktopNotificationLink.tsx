'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { getNotifications } from '@/app/actions/notifications';
import { useTranslations } from 'next-intl';

export default function DesktopNotificationLink() {
    const t = useTranslations('nav');
    const [unreadCount, setUnreadCount] = useState(0);
    const pathname = usePathname();

    const fetchUnread = async () => {
        try {
            const notifications = await getNotifications();
            setUnreadCount(notifications.filter(n => !n.isRead).length);
        } catch (e) {
            console.error("Failed to fetch notifications for desktop nav", e);
        }
    };

    useEffect(() => {
        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        return () => clearInterval(interval);
    }, [pathname]);

    return (
        <Link
            href="/notifications"
            className="icon-button"
            aria-label={t('notifications')}
            data-tooltip={t('notifications')}
        >
            <Bell size={20} />
            {unreadCount > 0 && (
                <span style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    background: 'var(--color-error)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '2px solid var(--color-surface)'
                }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
