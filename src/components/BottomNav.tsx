'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, BarChart2, Users, Bell, Command, QrCode } from 'lucide-react';
import { getNotifications } from '@/app/actions/notifications';
import { useState, useEffect } from 'react';
import { haptic } from '@/lib/haptics';

export default function BottomNav({ isAdmin }: { isAdmin?: boolean }) {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(path));
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const notifications = await getNotifications();
                setUnreadCount(notifications.filter(n => !n.isRead).length);
            } catch (e) {
                console.error("Failed to fetch notifications for bottom nav", e);
            }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleNavClick = () => {
        haptic.light();
    };

    return (
        <nav className="bottom-nav">
            <Link href="/" className={`bottom-nav-item ${pathname === '/' ? 'active' : ''}`} onClick={handleNavClick}>
                <span className="nav-icon-glow"><Home size={24} /></span>
            </Link>
            <Link href="/tournaments" className={`bottom-nav-item ${isActive('/tournaments') ? 'active' : ''}`} onClick={handleNavClick}>
                <span className="nav-icon-glow"><Trophy size={24} /></span>
            </Link>
            <Link href="/join" className={`bottom-nav-item ${isActive('/join') ? 'active' : ''}`} onClick={handleNavClick}>
                <span className="nav-icon-glow"><QrCode size={24} /></span>
            </Link>
            <Link href="/notifications" className={`bottom-nav-item ${isActive('/notifications') ? 'active' : ''}`} onClick={handleNavClick}>
                <div className="relative">
                    <span className="nav-icon-glow"><Bell size={24} /></span>
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '18px',
                            height: '18px',
                            padding: '0 4px',
                            background: 'var(--color-error)',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 700,
                            borderRadius: '9px',
                            border: '2px solid var(--color-surface)'
                        }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
            </Link>
            <Link href="/players" className={`bottom-nav-item ${isActive('/players') ? 'active' : ''}`} onClick={handleNavClick}>
                <span className="nav-icon-glow"><Users size={24} /></span>
            </Link>
            <Link href="/stats" className={`bottom-nav-item ${isActive('/stats') ? 'active' : ''}`} onClick={handleNavClick}>
                <span className="nav-icon-glow"><BarChart2 size={24} /></span>
            </Link>
            {isAdmin && (
                <Link href="/admin" className={`bottom-nav-item ${isActive('/admin') ? 'active' : ''}`} onClick={handleNavClick}>
                    <span className="nav-icon-glow"><Command size={24} /></span>
                </Link>
            )}
        </nav>
    );
}
