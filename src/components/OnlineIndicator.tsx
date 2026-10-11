'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

// crypto.randomUUID gibt es nur über HTTPS oder localhost; sonst selbst eine v4-UUID bauen
function randomId(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, v => v.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getOrCreatePresenceId(): string {
    const key = 'presence_id';
    let id = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))?.[1];
    if (!id) {
        id = randomId();
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
        // gleiche Höhe wie der Nüchtern-Schalter daneben und feste Breite, damit die Box nicht mit dem Text wächst
        <div className="online-box" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            padding: '0 14px', borderRadius: "var(--radius-md)",
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            fontSize: '0.82rem', color: 'var(--color-text-dim)', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
            <span style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: count > 1 ? "#08754b" : '#94a3b8',
                boxShadow: count > 1 ? '0 0 6px #22c55e88' : 'none',
            }} />
            {label}
        </div>
    );
}
