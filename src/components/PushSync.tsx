'use client';

import { useEffect } from 'react';
import { syncPushSubscription } from '@/lib/push-client';

// Einmal pro Sitzung im Hintergrund: Push-Anmeldung dieses Geräts auffrischen (siehe push-client.ts)
export default function PushSync() {
    useEffect(() => {
        try { if (sessionStorage.getItem('push-sync')) return; sessionStorage.setItem('push-sync', '1'); } catch { /* ohne Speicher trotzdem versuchen */ }
        // etwas später, damit der Start der App nicht gebremst wird
        const timer = setTimeout(() => { void syncPushSubscription().catch(() => undefined); }, 3000);
        return () => clearTimeout(timer);
    }, []);
    return null;
}
