'use client';

import { useEffect, useSyncExternalStore } from 'react';

// Ein gemeinsamer Zähler für Kopfzeile und Navigation: eine Abfrage statt zwei,
// und per fetch statt Server-Aktion, damit sie keinen Seitenwechsel blockiert.
let count = 0;
let users = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

async function refresh() {
    try {
        const res = await fetch('/api/notifications/unread', { cache: 'no-store' });
        if (!res.ok) return;
        const data: { count?: number } = await res.json();
        const next = typeof data.count === 'number' ? data.count : 0;
        if (next !== count) { count = next; listeners.forEach(l => l()); }
    } catch { /* offline: alten Wert behalten */ }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function refreshUnreadCount() { return refresh(); }

export function useUnreadCount(enabled: boolean): number {
    const value = useSyncExternalStore(subscribe, () => count, () => 0);
    useEffect(() => {
        if (!enabled) return;
        users++;
        if (users === 1) {
            refresh();
            timer = setInterval(refresh, 60_000);
        }
        // beim Zurückkehren in die App sofort aktualisieren
        const onVisible = () => { if (!document.hidden) refresh(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            users--;
            if (users === 0 && timer) { clearInterval(timer); timer = null; }
        };
    }, [enabled]);
    return enabled ? value : 0;
}
