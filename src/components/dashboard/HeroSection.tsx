'use client';

import { QrCode } from 'lucide-react';
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
            <Link href={userName ? '/join' : '/login'} className="btn btn-secondary">
                <QrCode size={20} />{userName ? t('join') : t('getStarted')}
            </Link>
        </header>
    );
}
