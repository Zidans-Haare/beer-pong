'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

function getOrCreatePresenceId(): string {
    const key = 'presence_id';
    let id = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))?.[1];
    if (!id) {
        id = crypto.randomUUID();
        // 30 min expiry, renewed on each heartbeat
        document.cookie = `${key}=${id}; path=/; max-age=1800; SameSite=Lax`;
    }
    return id;
}

export default function OnlineIndicator() {
    const t = useTranslations('home');
    const [count, setCount] = useState<number | null>(null);
    const [alone, setAlone] = useState(false);

    useEffect(() => {
        getOrCreatePresenceId();

        async function beat() {
            try {
                const res = await fetch('/api/presence', { method: 'POST' });
                const data = await res.json();
                setCount(data.count);
                setAlone(data.alone ?? false);
            } catch {
                // ignore
            }
        }

        beat();
        const interval = setInterval(beat, 30_000);
        return () => clearInterval(interval);
    }, []);

    if (count === null) return null;

    const label = alone
        ? t('aloneOnline')
        : count === 1 ? t('onePerson') : t('personsOnline', { count });

    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '5px 14px', borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            fontSize: '0.82rem', color: 'var(--color-text-dim)', fontWeight: 500,
        }}>
            <span style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: count > 1 ? '#22c55e' : '#94a3b8',
                boxShadow: count > 1 ? '0 0 6px #22c55e88' : 'none',
            }} />
            {label}
        </div>
    );
}
