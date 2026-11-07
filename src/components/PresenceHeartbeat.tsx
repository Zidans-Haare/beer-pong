'use client';

import { useEffect } from 'react';

// Wer die App offen hat, zählt als online, egal auf welcher Seite. Früher kam der Herzschlag nur von der Startseite;
// wer ein Turnier ansah oder Regeln las, fiel nach zwei Minuten aus der Anzeige.
const INTERVAL_MS = 30_000;
const KEY = 'presence_id';

function presenceCookie(): string | null {
    return document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`))?.[1] ?? null;
}

// Gäste ohne Anmeldung bekommen eine zufällige Kennung als Cookie (30 Minuten, wird bei jedem Herzschlag erneuert)
function ensureGuestId(): void {
    let id = presenceCookie();
    if (!id) {
        const b = crypto.getRandomValues(new Uint8Array(16));
        id = Array.from(b, v => v.toString(16).padStart(2, '0')).join('');
    }
    document.cookie = `${KEY}=${id}; path=/; max-age=1800; SameSite=Lax`;
}

export default function PresenceHeartbeat() {
    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        const beat = () => {
            if (document.visibilityState === 'hidden') return;
            ensureGuestId();
            fetch('/api/presence', { method: 'POST', keepalive: true }).catch(() => { /* offline: nächster Versuch folgt */ });
        };
        const onVisible = () => { if (document.visibilityState === 'visible') beat(); };
        beat();
        timer = setInterval(beat, INTERVAL_MS);
        // Beim Zurückkehren in die App (iOS hält sie im Hintergrund an) sofort wieder melden
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('pageshow', beat);
        window.addEventListener('focus', beat);
        window.addEventListener('online', beat);
        return () => {
            if (timer) clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('pageshow', beat);
            window.removeEventListener('focus', beat);
            window.removeEventListener('online', beat);
        };
    }, []);
    return null;
}
