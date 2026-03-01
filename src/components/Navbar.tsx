import Link from 'next/link';
import { auth, signOut } from '@/auth';
import DesktopNotificationLink from './DesktopNotificationLink';
import LogoEasterEgg from './LogoEasterEgg';

export default async function Navbar() {
    const session = await auth();

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 100,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0 var(--spacing-6)', height: '60px',
            background: 'rgba(248, 248, 252, 0.88)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
            marginBottom: 0,
        }}>
            <LogoEasterEgg />

            {/* Desktop Navigation Links */}
            <div className="desktop-nav-links" style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center' }}>
                <Link href="/tournaments" className="nav-link">Turniere</Link>
                <Link href="/join" className="nav-link" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Beitreten</Link>
                <Link href="/players" className="nav-link">Spieler</Link>
                <Link href="/stats" className="nav-link">Statistik</Link>
                {session?.user && <Link href="/chat" className="nav-link">Chat</Link>}
                {session?.user?.email === process.env.ADMIN_EMAIL && (
                    <Link href="/admin/broadcast" className="nav-link">Admin</Link>
                )}
                <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 var(--spacing-2)' }}></div>

                {session?.user && <DesktopNotificationLink />}
            </div>

            {/* Auth Section - Visible on Mobile too */}
            <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center' }}>
                {session?.user ? (
                    <>

                        <span className="desktop-nav-links" style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>{session.user.name}</span>
                        <form action={async () => {
                            'use server';
                            await signOut();
                        }}>
                            <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                Logout
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="nav-link" style={{ fontSize: '0.9rem' }}>Login</Link>
                        <Link href="/register" className="btn btn-primary" style={{ padding: 'var(--spacing-2) var(--spacing-4)', fontSize: '0.9rem' }}>Sign Up</Link>
                    </>
                )}
            </div>
        </nav>
    );
}
