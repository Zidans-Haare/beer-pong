'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Props {
    userName?: string | null;
}

export default function HeroSection({ userName }: Props) {
    const t = useTranslations('home');
    return (
        <header className="home-header">
            <div style={{ minWidth: 0 }}>
                <div className="eyebrow">{userName ? t('welcomeBack') : 'MATCHDAY'}</div>
                <h1>{userName || 'Bier Pong'}</h1>
            </div>
            {/* Beitreten liegt in der Navigation; hier nur der Einstieg für nicht angemeldete Besucher */}
            {!userName && <Link href="/login" className="btn btn-secondary">{t('getStarted')}</Link>}
        </header>
    );
}
