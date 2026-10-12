'use client';

import { useEffect } from 'react';

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
        // einfacher Aufruf statt Server Action, damit beim Start keine Seite neu geladen wird
        fetch('/api/pwa-status', { method: 'POST', keepalive: true })
            .then(res => { if (res.ok) { try { sessionStorage.setItem(key, '1'); } catch { /* egal */ } } })
            .catch(() => { /* beim nächsten Start wieder */ });
    }, [userId]);

    return null;
}
