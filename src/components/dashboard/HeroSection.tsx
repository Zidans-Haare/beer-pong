'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import HeroFigure from '@/components/dashboard/HeroFigure';
import type { FigureSpec } from '@/lib/figure';

interface Props {
    userName?: string | null;
    // eigene Figur und Spielername, nur wenn die Figur gestaltet wurde
    figure?: { name: string; spec: FigureSpec } | null;
}

export default function HeroSection({ userName, figure }: Props) {
    const t = useTranslations('home');
    return (
        <header className={`home-header${figure ? ' has-figure' : ''}`}>
            <div style={{ minWidth: 0 }}>
                <div className="eyebrow">{userName ? t('welcomeBack') : 'MATCHDAY'}</div>
                <h1>{userName || 'Bier Pong'}</h1>
            </div>
            {/* Beitreten liegt in der Navigation; hier nur der Einstieg für nicht angemeldete Besucher */}
            {!userName && <Link href="/login" className="btn btn-secondary">{t('getStarted')}</Link>}
            {figure && <HeroFigure name={figure.name} figure={figure.spec} />}
        </header>
    );
}
