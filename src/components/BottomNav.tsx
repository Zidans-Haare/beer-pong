'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, BarChart2, Users, Bell, Command, QrCode, Tv2, MessageSquare, Menu, Settings, BookOpen, ChevronRight } from 'lucide-react';
import { getNotifications } from '@/app/actions/notifications';
import { useState, useEffect } from 'react';
import { haptic } from '@/lib/haptics';
import SheetDialog from './SheetDialog';
import { useDrunkMode } from '@/context/DrunkModeContext';
import { useTranslations } from 'next-intl';

export default function BottomNav({ isAdmin, isLoggedIn, hasLiveStream }: { isAdmin?: boolean; isLoggedIn?: boolean; hasLiveStream?: boolean }) {
    const t = useTranslations('nav');
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(path));
    const [unreadCount, setUnreadCount] = useState(0);
    const [moreOpen, setMoreOpen] = useState(false);
    const { isDrunk } = useDrunkMode();

    useEffect(() => {
        if (!isLoggedIn) return;
        const fetchUnread = async () => {
            try {
                const notifications = await getNotifications();
                setUnreadCount(notifications.filter(n => !n.isRead).length);
            } catch { /* ignore */ }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        return () => clearInterval(interval);
    }, [isLoggedIn]);

    const handleNavClick = () => haptic.light();

    // ── Broadcast page: hide nav entirely ─────────────────────────────────
    if (/^\/tournaments\/[^/]+\/(?:broadcast|tv)$/.test(pathname)) return null;

    // ── Logged-out: floating QR pill ──────────────────────────────────────
    if (!isLoggedIn) {
        return (
            <Link href="/join" className="btn guest-join" onClick={handleNavClick}>
                <QrCode size={22} />{t('join')}
            </Link>
        );
    }

    // ── Logged-in: full bar expanding from center ─────────────────────────
    const navItems = [
        { href: '/', icon: Home, label: t('home') },
        { href: '/tournaments', icon: Trophy, label: t('tournaments') },
        { href: '/join', icon: QrCode, label: t('join') },
        ...(!isDrunk ? [{ href: '/stats', icon: BarChart2, label: t('stats') }] : []),
    ];
    const moreItems = [
        { href: '/players', icon: Users, label: t('players') },
        { href: '/chat', icon: MessageSquare, label: t('chat') },
        { href: '/notifications', icon: Bell, label: t('notifications'), badge: unreadCount },
        { href: '/streaming', icon: Tv2, label: t('streaming'), live: hasLiveStream },
        { href: '/settings', icon: Settings, label: t('settings') },
        { href: '/rules', icon: BookOpen, label: t('rules') },
        ...(isAdmin ? [{ href: '/admin', icon: Command, label: 'Admin' }] : []),
    ];
    const moreActive = moreItems.some(item => isActive(item.href));

    return (
        <>
            <nav className={`bottom-nav ${isDrunk ? 'drunk-nav' : ''}`} aria-label={t('navigation')}>
                {navItems.map(item => <Link key={item.href} href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`bottom-nav-item ${item.href === '/join' ? 'join-tab' : ''} ${isActive(item.href) ? 'active' : ''}`}
                    onClick={() => { handleNavClick(); setMoreOpen(false); }}>
                    <item.icon size={22} strokeWidth={1.8} /><span>{item.label}</span>
                </Link>)}
                {!isDrunk && <button type="button" className={`bottom-nav-item ${moreActive || moreOpen ? 'active' : ''}`}
                    aria-expanded={moreOpen} aria-haspopup="dialog" onClick={() => { handleNavClick(); setMoreOpen(true); }}>
                    <Menu size={22} strokeWidth={1.8} /><span>{t('more')}</span>
                    {unreadCount > 0 && <span className="nav-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>}
            </nav>
            {!isDrunk && <SheetDialog open={moreOpen} title={t('more')} onClose={() => setMoreOpen(false)}>
                <div className="more-list">{moreItems.map(item => <Link href={item.href} key={item.href} className="more-link" onClick={() => setMoreOpen(false)}>
                    <item.icon size={22} /><span>{item.label}</span>
                    {'badge' in item && !!item.badge && <span className="badge">{item.badge}</span>}
                    {'live' in item && item.live && <span className="live-dot" />}
                    <ChevronRight size={18} />
                </Link>)}</div>
            </SheetDialog>}
        </>
    );
}
