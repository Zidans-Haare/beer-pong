'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Users, Radio, LayoutDashboard, Settings, Trophy,
    UserCheck, MessageSquare, UserX, User, KeyRound,
} from 'lucide-react';
import './admin-nav.css';

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

interface Props {
    pendingCount: number;
}

function buildSections(pendingCount: number): NavSection[] {
    return [
        {
            title: 'Übersicht',
            items: [
                { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
            ],
        },
        {
            title: 'Personen',
            items: [
                { href: '/admin/approvals', label: 'Anfragen', icon: UserCheck, badge: pendingCount },
                { href: '/admin/users', label: 'Benutzer', icon: Users },
                { href: '/admin/players', label: 'Spieler', icon: User },
                { href: '/admin/passkeys', label: 'Passkeys', icon: KeyRound },
            ],
        },
        {
            title: 'Turnier',
            items: [
                { href: '/admin/tournaments', label: 'Turniere', icon: Trophy },
                { href: '/admin/guests', label: 'Gäste', icon: UserX },
            ],
        },
        {
            title: 'Tools',
            items: [
                { href: '/admin/chat', label: 'Chat', icon: MessageSquare },
                { href: '/admin/broadcast', label: 'Broadcast', icon: Radio },
                { href: '/admin/settings', label: 'Setup', icon: Settings },
            ],
        },
    ];
}

function isActive(pathname: string, href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
}

export default function AdminNav({ pendingCount }: Props) {
    const pathname = usePathname();
    const sections = buildSections(pendingCount);
    const allItems = sections.flatMap(s => s.items);

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className="admin-sidebar"
                style={{
                    width: '220px',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    zIndex: 50,
                    flexDirection: 'column',
                    background: 'rgba(12, 12, 18, 0.98)',
                    borderRight: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                {/* Logo area */}
                <div style={{
                    padding: '20px 16px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.25)',
                        marginBottom: '3px',
                        fontFamily: 'monospace',
                    }}>
                        Bierpong
                    </div>
                    <div style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontFamily: 'var(--font-heading)',
                        letterSpacing: '-0.01em',
                    }}>
                        Admin
                    </div>
                </div>

                {/* Grouped Nav */}
                <nav style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                }}>
                    {sections.map(section => (
                        <div key={section.title}>
                            <div style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.22)',
                                fontFamily: 'monospace',
                                padding: '0 12px',
                                marginBottom: '4px',
                            }}>
                                {section.title}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                {section.items.map(item => {
                                    const active = isActive(pathname, item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`admin-nav-link${active ? ' active' : ''}`}
                                        >
                                            <item.icon size={15} style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }} />
                                            <span style={{ flex: 1 }}>{item.label}</span>
                                            {item.badge && item.badge > 0 ? (
                                                <span style={{
                                                    background: 'var(--color-primary)',
                                                    color: '#fff',
                                                    borderRadius: '100px',
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    padding: '1px 6px',
                                                    lineHeight: 1.4,
                                                }}>
                                                    {item.badge}
                                                </span>
                                            ) : null}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bottom hint */}
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.18)',
                    fontFamily: 'monospace',
                }}>
                    admin@bierpong
                </div>
            </aside>

            {/* Mobile Bottom Nav — horizontal scrollable */}
            <nav
                className="admin-mobile-nav admin-mobile-scroll"
                style={{
                    position: 'fixed',
                    bottom: '78px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'calc(100% - 24px)',
                    maxWidth: '500px',
                    zIndex: 60,
                    display: 'none',
                    background: 'rgba(12,12,18,0.96)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    padding: '6px 8px',
                }}
            >
                <div style={{
                    display: 'flex',
                    gap: '2px',
                    minWidth: 'max-content',
                }}>
                    {allItems.map(item => {
                        const active = isActive(pathname, item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`admin-mobile-link${active ? ' active' : ''}`}
                            >
                                <div style={{ position: 'relative' }}>
                                    <item.icon size={17} />
                                    {item.badge && item.badge > 0 ? (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-4px',
                                            right: '-6px',
                                            background: 'var(--color-primary)',
                                            color: '#fff',
                                            borderRadius: '100px',
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            padding: '1px 4px',
                                            lineHeight: 1.2,
                                        }}>
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </div>
                                <span style={{
                                    fontSize: '9px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
