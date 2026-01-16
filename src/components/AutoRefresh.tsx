'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState(intervalMs / 1000);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setIsRefreshing(true);
                    router.refresh();

                    // Reset refreshing state after a bit (enough for SC to re-run and send payload)
                    setTimeout(() => setIsRefreshing(false), 2000);

                    return intervalMs / 1000;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [router, intervalMs]);

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeLeft(intervalMs / 1000);
        setTimeout(() => setIsRefreshing(false), 2000);
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
            <span>{isRefreshing ? 'Aktualisiere...' : `Auto-Refresh in ${timeLeft}s`}</span>
            <button
                onClick={handleManualRefresh}
                className="btn-secondary"
                style={{
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    height: 'auto',
                    minHeight: 'unset'
                }}
            >
                Jetzt aktualisieren
            </button>
        </div>
    );
}
