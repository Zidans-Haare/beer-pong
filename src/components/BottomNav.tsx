'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, BarChart2, Users } from 'lucide-react';

export default function BottomNav() {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;

    return (
        <nav className="bottom-nav">
            <Link href="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
                <span className="nav-icon-glow"><Home size={24} /></span>
            </Link>
            <Link href="/tournaments" className={`bottom-nav-item ${isActive('/tournaments') ? 'active' : ''}`}>
                <span className="nav-icon-glow"><Trophy size={24} /></span>
            </Link>
            <Link href="/stats" className={`bottom-nav-item ${isActive('/stats') ? 'active' : ''}`}>
                <span className="nav-icon-glow"><BarChart2 size={24} /></span>
            </Link>
            <Link href="/players" className={`bottom-nav-item ${isActive('/players') ? 'active' : ''}`}>
                <span className="nav-icon-glow"><Users size={24} /></span>
            </Link>
        </nav>
    );
}
