// Push-Anmeldung dieses Geräts sicherstellen. Hat das Gerät die Erlaubnis, aber keine (gespeicherte) Anmeldung,
// wird sie ohne Rückfrage neu angelegt und an den Server geschickt. So heilt sich ein Handy selbst, dessen Anmeldung
// verloren ging (neu installiert, von iOS verworfen, Service Worker beim Start nicht geladen).
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export function urlBase64ToUint8Array(base64String: string) {
    if (!base64String) return new Uint8Array(0);
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// `ask`: darf nach der Erlaubnis fragen (nur nach einem Tipp des Nutzers); sonst nur, wenn sie schon erteilt ist
export async function syncPushSubscription({ ask = false }: { ask?: boolean } = {}): Promise<boolean> {
    if (!pushSupported()) return false;
    if (Notification.permission === 'denied') return false;
    if (Notification.permission !== 'granted' && !ask) return false;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;
    await navigator.serviceWorker.register('/sw.js');
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
    const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
    return res.ok;
}
