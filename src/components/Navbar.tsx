import Link from 'next/link';
import { auth, signOut } from '@/auth';
import DesktopNotificationLink from './DesktopNotificationLink';
import LogoEasterEgg from './LogoEasterEgg';
import { getTranslations } from 'next-intl/server';
import { isDemoMode } from '@/lib/demo';
import { LogOut, UserRound } from 'lucide-react';

export default async function Navbar() {
    const session = await auth();
    const t = await getTranslations('nav');

    return (
        <nav className="app-header" aria-label={t('navigation')}>
            <LogoEasterEgg />

            {/* Desktop Navigation Links */}
            <div className="desktop-nav-links" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Link href="/tournaments" className="nav-link">{t('tournaments')}</Link>
                <Link href="/join" className="nav-link" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{t('join')}</Link>
                <Link href="/players" className="nav-link">{t('players')}</Link>
                <Link href="/stats" className="nav-link">{t('stats')}</Link>
                <Link href="/chat" className="nav-link">{t('chat')}</Link>
                <Link href="/streaming" className="nav-link">Streaming</Link>
                {session?.user?.email === process.env.ADMIN_EMAIL && (
                    <Link href="/admin/broadcast" className="nav-link">Admin</Link>
                )}
                <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 var(--spacing-2)' }}></div>

            </div>

            {/* Auth Section - Visible on Mobile too */}
            <div className="app-header-actions">
                {session?.user ? (
                    <>

                        <DesktopNotificationLink />
                        <Link href="/players" className="icon-button" aria-label={t('profile')} data-tooltip={t('profile')}><UserRound size={21} /></Link>
                        <form action={async () => {
                            'use server';
                            await signOut();
                        }}>
                            <button type="submit" className="icon-button" aria-label="Logout" data-tooltip="Logout">
                                <LogOut size={20} />
                            </button>
                        </form>
                    </>
                ) : !isDemoMode ? (
                    <>
                        <Link href="/login" className="nav-link" style={{ fontSize: '0.9rem' }}>Login</Link>
                        <Link href="/register" className="btn btn-primary" style={{ padding: '10px 12px', fontSize: '0.8125rem' }}>{t('register')}</Link>
                    </>
                ) : (
                    <Link href="/login" className="btn btn-primary" style={{ padding: 'var(--spacing-2) var(--spacing-4)', fontSize: '0.9rem' }}>Try Demo</Link>
                )}
            </div>
        </nav>
    );
}
