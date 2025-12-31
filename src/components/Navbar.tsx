import Link from 'next/link';
import { auth, signOut } from '@/auth';

export default async function Navbar() {
    const session = await auth();

    return (
        <nav className="glass-panel" style={{ padding: 'var(--spacing-4) var(--spacing-6)', marginBottom: 'var(--spacing-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: 'white' }}>
                🍻 Pong Manager
            </Link>

            <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center' }}>
                <Link href="/tournaments" className="nav-link">Turniere</Link>
                <Link href="/players" className="nav-link">Spieler</Link>
                <Link href="/stats" className="nav-link">Statistik</Link>

                <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 var(--spacing-2)' }}></div>

                {session?.user ? (
                    <>
                        <span style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>{session.user.name}</span>
                        <form action={async () => {
                            'use server';
                            await signOut();
                        }}>
                            <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}>Logout</button>
                        </form>
                    </>
                ) : (
                    <>
                        <Link href="/login" style={{ color: 'white', textDecoration: 'none' }}>Login</Link>
                        <Link href="/register" className="btn btn-primary" style={{ padding: 'var(--spacing-2) var(--spacing-4)', fontSize: '0.9rem' }}>Sign Up</Link>
                    </>
                )}
            </div>
        </nav>
    );
}
