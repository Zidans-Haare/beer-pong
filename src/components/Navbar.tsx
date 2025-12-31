import Link from 'next/link';
import '@/app/globals.css';

export default function Navbar() {
    return (
        <nav style={{
            borderBottom: '1px solid var(--color-border)',
            padding: 'var(--spacing-4) 0',
            marginBottom: 'var(--spacing-8)',
            background: 'rgba(5, 5, 16, 0.8)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href="/" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', letterSpacing: '-0.02em' }}>
                    <span style={{ color: 'var(--color-primary)' }}>Beer</span>
                    <span style={{ color: 'var(--color-secondary)' }}>Pong</span>
                </Link>
                <div style={{ display: 'flex', gap: 'var(--spacing-6)' }}>
                    <Link href="/tournaments" className="nav-link">Turniere</Link>
                    <Link href="/players" className="nav-link">Spieler</Link>
                    <Link href="/stats" className="nav-link">Statistik</Link>
                </div>
            </div>
        </nav>
    );
}
