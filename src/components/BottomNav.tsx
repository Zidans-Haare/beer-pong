'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="bottom-nav">
            <Link href="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
                <span style={{ fontSize: '1.2rem' }}>🏠</span>
                <span style={{ fontSize: '0.7rem' }}>Home</span>
            </Link>
            <Link href="/tournaments" className={`bottom-nav-item ${isActive('/tournaments') ? 'active' : ''}`}>
                <span style={{ fontSize: '1.2rem' }}>🏆</span>
                <span style={{ fontSize: '0.7rem' }}>Turniere</span>
            </Link>
            <Link href="/players" className={`bottom-nav-item ${isActive('/players') ? 'active' : ''}`}>
                <span style={{ fontSize: '1.2rem' }}>👥</span>
                <span style={{ fontSize: '0.7rem' }}>Spieler</span>
            </Link>
            <Link href="/stats" className={`bottom-nav-item ${isActive('/stats') ? 'active' : ''}`}>
                <span style={{ fontSize: '1.2rem' }}>📊</span>
                <span style={{ fontSize: '0.7rem' }}>Stats</span>
            </Link>
        </nav>
    );
}
