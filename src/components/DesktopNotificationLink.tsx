'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { getNotifications } from '@/app/actions/notifications';

export default function DesktopNotificationLink() {
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
            className="relative p-2 text-gray-400 hover:text-white transition-colors hidden md:block"
            title="Benachrichtigungen"
        >
            <Bell size={20} />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-slate-900 shadow-sm animate-pulse-subtle">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
