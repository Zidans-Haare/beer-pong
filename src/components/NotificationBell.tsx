'use client';

import { useState, useEffect, useRef } from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notifications';
import { usePathname, useRouter } from 'next/navigation';
import NotificationSettingsDialog from './NotificationSettingsDialog';
import { Settings } from 'lucide-react';

type Notification = {
    id: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: Date;
    type: string;
};

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

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

    // Poll for notifications or fetch on mount
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [pathname]); // Refetch on navigation too

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleRead = async (id: string, link: string | null) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

        // Mark as read in background
        markNotificationAsRead(id);

        setIsOpen(false);

        if (link) {
            router.push(link);
        }
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        await markAllNotificationsAsRead();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Notifications"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 hover:opacity-100 transition-opacity">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>

                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-slate-900 shadow-sm animate-pulse-subtle">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 glass-panel z-50 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>

                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md">
                        <span className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                            🔔 Benachrichtigungen
                        </span>
                        <div className="flex gap-2 items-center">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium px-2 py-1 rounded hover:bg-white/5"
                                >
                                    Alle gelesen
                                </button>
                            )}
                            <button
                                onClick={() => { setIsOpen(false); setShowSettings(true); }}
                                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
                                title="Einstellungen"
                            >
                                <Settings size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500 gap-3">
                                <div className="p-3 bg-white/5 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium">Keine neuen Nachrichten</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleRead(notification.id, notification.link)}
                                        className={`
                                            p-4 cursor-pointer transition-all duration-200 relative group
                                            ${!notification.isRead ? 'bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-500' : 'hover:bg-white/5 border-l-2 border-transparent'}
                                        `}
                                    >
                                        <div className="flex items-start gap-3">
                                            {!notification.isRead && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-medium mb-1 truncate ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}>
                                                    {notification.title}
                                                </div>
                                                <div className="text-xs text-gray-400 leading-relaxed line-clamp-2 group-hover:text-gray-300 transition-colors">
                                                    {notification.message}
                                                </div>
                                                <div className="text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-wider">
                                                    {new Date(notification.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showSettings && <NotificationSettingsDialog onClose={() => setShowSettings(false)} />}
        </div>
    );
}
