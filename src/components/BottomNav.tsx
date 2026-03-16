'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, BarChart2, Users, Bell, Command, QrCode } from 'lucide-react';
import { getNotifications } from '@/app/actions/notifications';
import { useState, useEffect } from 'react';
import { haptic } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';

export default function BottomNav({ isAdmin, isLoggedIn }: { isAdmin?: boolean; isLoggedIn?: boolean }) {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(path));
    const [unreadCount, setUnreadCount] = useState(0);

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

    // ── Logged-out: floating QR pill ──────────────────────────────────────
    if (!isLoggedIn) {
        return (
            <motion.div
                initial={{ y: 80, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.15 }}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    translateX: '-50%',
                    zIndex: 1000,
                    display: 'flex',
                }}
            >
                <Link
                    href="/join"
                    onClick={handleNavClick}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '14px 28px',
                        borderRadius: '100px',
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-xl)',
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    <QrCode size={24} strokeWidth={1.8} />
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>
                        Beitreten
                    </span>
                </Link>
            </motion.div>
        );
    }

    // ── Logged-in: full bar expanding from center ─────────────────────────
    const navItems = [
        { href: '/',              icon: Home,          label: 'Home' },
        { href: '/tournaments',   icon: Trophy,        label: 'Turniere' },
        { href: '/players',       icon: Users,         label: 'Spieler' },
        { href: '/stats',         icon: BarChart2,     label: 'Stats' },
        { href: '/notifications', icon: Bell,          label: 'Mehr', badge: unreadCount },
        ...(isAdmin ? [{ href: '/admin', icon: Command, label: 'Admin', badge: 0 }] : []),
    ];

    return (
        <AnimatePresence>
            <motion.nav
                className="bottom-nav"
                initial={{ y: 96, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
            >
                {navItems.map(item => (
                    <motion.div
                        key={item.href}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 + navItems.indexOf(item) * 0.04 }}
                    >
                        <Link
                            href={item.href}
                            className={`bottom-nav-item ${(item.href === '/' ? pathname === '/' : isActive(item.href)) ? 'active' : ''}`}
                            onClick={handleNavClick}
                            style={{ position: 'relative' }}
                        >
                            {(item.href === '/' ? pathname === '/' : isActive(item.href)) && (
                                <motion.span
                                    layoutId="bottom-nav-pill"
                                    style={{
                                        position: 'absolute', inset: 0,
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--color-primary-light)',
                                        zIndex: 0,
                                    }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                            )}
                            {item.href === '/notifications' ? (
                                <>
                                <div style={{ position: 'relative', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                                    <span className="nav-icon-glow" style={{ display: 'flex', position: 'relative', top: '-2px' }}>
                                        <Bell size={22} />
                                    </span>
                                    <AnimatePresence>
                                        {unreadCount > 0 && (
                                            <motion.span
                                                key="badge"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    right: 0,
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
                                                    border: '2px solid rgba(255,255,255,0.92)',
                                                    zIndex: 10,
                                                }}
                                            >
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <span className="nav-label" style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                                </>
                            ) : (
                                <>
                                <span className="nav-icon-glow" style={{ position: 'relative', zIndex: 1 }}><item.icon size={22} /></span>
                                <span className="nav-label" style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                                </>
                            )}
                        </Link>
                    </motion.div>
                ))}
            </motion.nav>
        </AnimatePresence>
    );
}
