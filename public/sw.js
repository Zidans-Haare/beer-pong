/**
 * Bierpong PWA Service Worker
 * Provides offline support, caching strategies, and push notifications
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `bierpong-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `bierpong-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `bierpong-images-${CACHE_VERSION}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon.png',
];

// Cache size limits
const DYNAMIC_CACHE_LIMIT = 50;
const IMAGE_CACHE_LIMIT = 30;

/**
 * Trim cache to specified limit (FIFO)
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.log('[SW] Install error:', err))
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key.startsWith('bierpong-') &&
              key !== STATIC_CACHE &&
              key !== DYNAMIC_CACHE &&
              key !== IMAGE_CACHE)
            .map((key) => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch Event - Apply caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip API routes that modify data
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') return;

  // Strategy: Network First for HTML pages (always try to get fresh content)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Strategy: Cache First for static assets (JS, CSS, fonts)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy: Stale While Revalidate for images
  if (isImageRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, IMAGE_CACHE_LIMIT));
    return;
  }

  // Strategy: Network First for API calls (with cache fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirst(request, DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT));
});

/**
 * Check if request is for a static asset
 */
function isStaticAsset(pathname) {
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(pathname) ||
    pathname.startsWith('/_next/static/');
}

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  const url = new URL(request.url);
  return /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname) ||
    request.destination === 'image';
}

/**
 * Cache First Strategy
 * Try cache, fall back to network
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match('/offline');
  }
}

/**
 * Network First Strategy
 * Try network, fall back to cache, then offline page
 */
async function networkFirst(request, cacheName = DYNAMIC_CACHE, cacheLimit = DYNAMIC_CACHE_LIMIT) {
  try {
    const response = await fetch(request);

    // Cache successful GET responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      trimCache(cacheName, cacheLimit);
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline');
    }

    // Return error response for other requests
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request, cacheName, cacheLimit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        trimCache(cacheName, cacheLimit);
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

/**
 * Push Notification Handler
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.message || data.body,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [100, 50, 100],
      tag: data.tag || 'bierpong-notification',
      renotify: true,
      data: {
        dateOfArrival: Date.now(),
        url: data.link || data.url || '/',
      },
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Bier Pong', options)
    );
  } catch (error) {
    console.error('[SW] Push error:', error);
  }
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if available
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(url);
      })
  );
});

/**
 * Message Handler - For skip waiting and cache invalidation
 */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      )
    );
  }
});

/**
 * Background Sync Handler (for offline actions)
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

/**
 * Sync pending offline actions
 */
async function syncPendingActions() {
  // This will be called when connection is restored
  // Actual implementation will use IndexedDB to store pending actions
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}
