import Link from 'next/link';
import { Users, Radio, LayoutDashboard, Settings, Trophy, UserCheck, MessageSquare, UserX, User, KeyRound } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
        redirect('/');
    }

    const pendingCount = await prisma.user.count({ where: { status: 'PENDING' } });

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
        { href: '/admin/approvals', label: 'Anfragen', icon: UserCheck, badge: pendingCount },
        { href: '/admin/users', label: 'Benutzer', icon: Users, badge: 0 },
        { href: '/admin/players', label: 'Spieler', icon: User, badge: 0 },
        { href: '/admin/passkeys', label: 'Passkeys', icon: KeyRound, badge: 0 },
        { href: '/admin/tournaments', label: 'Turniere', icon: Trophy, badge: 0 },
        { href: '/admin/chat', label: 'Chat', icon: MessageSquare, badge: 0 },
        { href: '/admin/guests', label: 'Gäste', icon: UserX, badge: 0 },
        { href: '/admin/broadcast', label: 'Broadcast', icon: Radio, badge: 0 },
        { href: '/admin/settings', label: 'Setup', icon: Settings, badge: 0 },
    ];

    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
            {/* Desktop Sidebar - Fixed Positioning */}
            <aside
                className="glass-panel"
                style={{
                    width: '240px',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    zIndex: 50,
                    borderRadius: 0,
                    borderRight: '1px solid var(--color-border)',
                    display: 'none', // Hidden on mobile by default, toggled via media query below
                    flexDirection: 'column',
                    background: 'var(--color-surface)'
                }}
            >
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media (min-width: 769px) {
                        aside { display: flex !important; }
                        main { margin-left: 240px !important; }
                    }
                    @media (max-width: 768px) {
                        main { padding-bottom: 100px !important; }
                        nav.admin-mobile-nav { display: flex !important; }
                    }
                `}} />

                <div style={{ padding: 'var(--spacing-6)', borderBottom: '1px solid var(--color-border)' }}>
                    <h2 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
                        ADMIN LEVEL
                    </h2>
                </div>

                <nav style={{ flex: 1, padding: 'var(--spacing-6) var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-3)',
                                padding: '12px var(--spacing-4)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-text-dim)',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                background: 'transparent'
                            }}
                        >
                            <item.icon size={20} />
                            <span style={{ fontWeight: 500, flex: 1 }}>{item.label}</span>
                            {item.badge > 0 && (
                                <span style={{
                                    background: 'var(--color-primary)',
                                    color: '#fff',
                                    borderRadius: '100px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    minWidth: '20px',
                                    textAlign: 'center',
                                }}>
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Content Area */}
            <main style={{
                flex: 1,
                padding: 'var(--spacing-6)', // Reduced padding to bring it closer
                maxWidth: '900px', // Reduced max-width to keep it tighter/more centered relative to the available space
                // No auto margin, just allow it to flow next to the sidebar
                width: '100%',
                position: 'relative',
                zIndex: 1
            }}>
                {children}
            </main>

            {/* Mobile Admin Sub-Navigation */}
            <nav
                className="admin-mobile-nav"
                style={{
                    position: 'fixed',
                    bottom: '90px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '96%',
                    maxWidth: '480px',
                    borderRadius: '20px',
                    border: '1px solid var(--color-border)',
                    zIndex: 60,
                    display: 'none',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    padding: '10px 8px',
                    background: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-xl)',
                }}
            >
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                            color: 'var(--color-text-dim)',
                            textDecoration: 'none',
                            padding: '4px 6px',
                            position: 'relative',
                            minWidth: 0,
                            flex: 1,
                        }}
                    >
                        <item.icon size={18} />
                        {item.badge > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '0px',
                                right: '4px',
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
                        )}
                        <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, textAlign: 'center' }}>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
