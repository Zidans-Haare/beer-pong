'use client';

import { useEffect } from 'react';
import { updatePwaStatus } from '@/app/actions/auth';

// Läuft die App vom Startbildschirm (eigenes Fenster), gilt sie als installiert. iOS meldet das über navigator.standalone,
// Android je nach Aufmachung als standalone, fullscreen oder minimal-ui.
function launchedAsApp(): boolean {
    const modes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];
    return modes.some(mode => window.matchMedia(`(display-mode: ${mode})`).matches) || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

export default function PWATracker({ userId }: { userId?: string }) {
    useEffect(() => {
        if (!userId || !launchedAsApp()) return;
        // Einmal pro Start der App melden (nicht einmal für immer): So stimmt der Stand auch, wenn er später zurückgesetzt wurde
        const key = 'pwa_synced_' + userId;
        try { if (sessionStorage.getItem(key)) return; } catch { /* ohne Speicher einfach melden */ }
        updatePwaStatus(true)
            .then(res => { if (res.success) { try { sessionStorage.setItem(key, '1'); } catch { /* egal */ } } })
            .catch(err => console.error('Failed to update PWA status:', err));
    }, [userId]);

    return null;
}
