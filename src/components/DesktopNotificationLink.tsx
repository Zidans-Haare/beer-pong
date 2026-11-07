'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUnreadCount } from '@/hooks/useUnreadCount';

export default function DesktopNotificationLink() {
    const t = useTranslations('nav');
    // gemeinsamer Zähler mit der unteren Navigation (eine leichte Abfrage statt zwei Server-Aktionen)
    const unreadCount = useUnreadCount(true);

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
