'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Users, Radio, LayoutDashboard, Settings, Trophy,
    UserCheck, MessageSquare, UserX, User, KeyRound, ChevronDown, ChevronRight, CalendarRange, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import SheetDialog from '@/components/SheetDialog';
import { useTranslations } from 'next-intl';
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

function isActive(pathname: string, href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
}

export default function AdminNav({ pendingCount }: Props) {
    const pathname = usePathname();
    const t = useTranslations('admin.nav');
    const [sectionOpen, setSectionOpen] = useState(false);

    const sections: NavSection[] = [
        {
            title: t('overview'),
            items: [
                { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
            ],
        },
        {
            title: t('people'),
            items: [
                { href: '/admin/approvals', label: t('approvals'), icon: UserCheck, badge: pendingCount },
                { href: '/admin/users', label: t('users'), icon: Users },
                { href: '/admin/players', label: t('players'), icon: User },
                { href: '/admin/passkeys', label: t('passkeys'), icon: KeyRound },
            ],
        },
        {
            title: t('tournament'),
            items: [
                { href: '/admin/tournaments', label: t('tournaments'), icon: Trophy },
                { href: '/admin/seasons', label: t('seasons'), icon: CalendarRange },
                { href: '/admin/guests', label: t('guests'), icon: UserX },
            ],
        },
        {
            title: t('tools'),
            items: [
                { href: '/admin/chat', label: t('chat'), icon: MessageSquare },
                { href: '/admin/broadcast', label: t('broadcast'), icon: Radio },
                { href: '/admin/wrapped', label: t('wrapped'), icon: Sparkles },
                { href: '/admin/settings', label: t('setup'), icon: Settings },
            ],
        },
    ];
    const allItems = sections.flatMap(s => s.items);
    const currentItem = allItems.find(item => isActive(pathname, item.href)) || allItems[0];

    return (
        <>
            <button type="button" className="admin-section-button" onClick={() => setSectionOpen(true)} aria-haspopup="dialog" aria-expanded={sectionOpen}>
                <span className="eyebrow">ADMIN</span><span>{currentItem.label}</span><ChevronDown size={20} />
                {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
            </button>
            {/* Desktop Sidebar */}
            <aside
                className="admin-sidebar"
                style={{
                    width: '220px',
                    height: 'calc(100dvh - var(--header-height))',
                    position: 'fixed',
                    left: 0,
                    top: 'var(--header-height)',
                    zIndex: 50,
                    flexDirection: 'column',
                    background: 'var(--color-surface)',
                    borderRight: '1px solid var(--color-border)',
                    backdropFilter: "none",
                }}
            >
                {/* Logo area */}
                <div style={{
                    padding: '20px 16px 16px',
                    borderBottom: '1px solid var(--color-border)',
                }}>
                    <div style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: "0",
                        textTransform: 'uppercase',
                        color: 'var(--color-text-subtle)',
                        marginBottom: '3px',
                        fontFamily: 'monospace',
                    }}>
                        {process.env.NEXT_PUBLIC_APP_NAME || 'Beer Pong'}
                    </div>
                    <div style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        background: "none",
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: "currentColor",
                        backgroundClip: 'text',
                        fontFamily: 'var(--font-heading)',
                        letterSpacing: "0",
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
                                letterSpacing: "0",
                                textTransform: 'uppercase',
                                color: 'var(--color-text-subtle)',
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
                                                    borderRadius: "6px",
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
                    borderTop: '1px solid var(--color-border)',
                    fontSize: '0.7rem',
                    color: 'var(--color-text-subtle)',
                    fontFamily: 'monospace',
                }}>
                    admin@bierpong
                </div>
            </aside>

            <SheetDialog open={sectionOpen} title="Admin" onClose={() => setSectionOpen(false)}>
                {sections.map(section => <section key={section.title} className="admin-menu-section">
                    <h3 className="eyebrow">{section.title}</h3>
                    <div className="more-list">{section.items.map(item => <Link key={item.href} href={item.href} className="more-link" aria-current={isActive(pathname, item.href) ? 'page' : undefined} onClick={() => setSectionOpen(false)}>
                        <item.icon size={21} /><span>{item.label}</span>{!!item.badge && <span className="badge">{item.badge}</span>}<ChevronRight size={18} />
                    </Link>)}</div>
                </section>)}
            </SheetDialog>
        </>
    );
}
