'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
    const t = useTranslations('tournaments');
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState(intervalMs / 1000);
    const [isRefreshing, startTransition] = useTransition();
    const timeRef = useRef(intervalMs / 1000);

    useEffect(() => {
        timeRef.current = intervalMs / 1000;
        const timer = setInterval(() => {
            if (document.querySelector('dialog[open]') || document.visibilityState === 'hidden') return;
            if (timeRef.current <= 1) {
                timeRef.current = intervalMs / 1000;
                startTransition(() => router.refresh());
            } else timeRef.current--;
            setTimeLeft(timeRef.current);
        }, 1000);

        return () => clearInterval(timer);
    }, [router, intervalMs]);

    const handleManualRefresh = () => {
        if (document.querySelector('dialog[open]')) return;
        startTransition(() => router.refresh());
        timeRef.current = intervalMs / 1000;
        setTimeLeft(intervalMs / 1000);
    };

    return (
        <div style={{
            marginTop: 'var(--spacing-4)',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--color-text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-2)'
        }}>
            <span>{isRefreshing ? t('refreshing') : t('autoRefresh', { seconds: timeLeft })}</span>
            <button
                onClick={handleManualRefresh}
                className="icon-button"
                disabled={isRefreshing}
                aria-label={t('refreshNow')}
                data-tooltip={t('refreshNow')}
            >
                <RefreshCw size={18} className={isRefreshing ? 'loading-spin' : ''} />
            </button>
        </div>
    );
}
