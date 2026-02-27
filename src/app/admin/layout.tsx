import Link from 'next/link';
import { Users, Radio, LayoutDashboard, Settings, Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
        redirect('/');
    }

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/users', label: 'Benutzer', icon: Users },
        { href: '/admin/tournaments', label: 'Turniere', icon: Trophy },
        { href: '/admin/broadcast', label: 'Broadcast', icon: Radio },
        { href: '/admin/settings', label: 'Setup', icon: Settings },
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
                            <span style={{ fontWeight: 500 }}>{item.label}</span>
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
                className="glass-panel admin-mobile-nav"
                style={{
                    position: 'fixed',
                    bottom: '90px', // Above the global bottom nav
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90%',
                    maxWidth: '350px',
                    borderRadius: '100px',
                    border: '1px solid var(--color-border)',
                    zIndex: 60, // Higher z-index to ensure visibility
                    display: 'none', // Hidden on desktop
                    justifyContent: 'space-evenly',
                    padding: '12px 20px',
                    background: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-xl)'
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
                            gap: '4px',
                            color: 'var(--color-text-dim)',
                            textDecoration: 'none',
                            padding: '4px'
                        }}
                    >
                        <item.icon size={20} />
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
