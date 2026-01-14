/**
 * Service Worker Registration and Management
 */

export interface SWConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

/**
 * Register the service worker
 */
export async function registerSW(config: SWConfig = {}): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Registered successfully');

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            console.log('[SW] Update available');
            config.onUpdate?.(registration);
          } else {
            // First install
            console.log('[SW] Content cached for offline use');
            config.onSuccess?.(registration);
          }
        }
      });
    });

    // Check for updates periodically (every 5 minutes)
    setInterval(() => {
      registration.update();
    }, 5 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterSW(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('[SW] Unregistered successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SW] Unregister failed:', error);
    return false;
  }
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<void> {
  if (!('caches' in window)) return;

  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  console.log('[SW] Caches cleared');
}

/**
 * Send message to service worker
 */
export function sendMessage(message: { type: string; payload?: unknown }): void {
  if (!navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage(message);
}

/**
 * Request background sync
 */
export async function requestSync(tag: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register(tag);
      console.log('[SW] Sync registered:', tag);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SW] Sync registration failed:', error);
    return false;
  }
}
