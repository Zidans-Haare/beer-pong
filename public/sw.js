/**
 * Bierpong PWA Service Worker
 * Provides offline support, caching strategies, and push notifications
 */

const CACHE_VERSION = 'v10';
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

  // Skip _next/static and _next/data - let browser HTTP cache handle these
  // Next.js uses content-hashed filenames, so the browser cache is sufficient
  // Caching these in the SW causes stale chunk errors after deploys
  if (url.pathname.startsWith('/_next/')) return;

  // Strategy: Network First for HTML pages (always try to get fresh content)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Strategy: Network First for static assets (JS, CSS, fonts)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
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
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(pathname);
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
 * Notification Categories with predefined actions
 */
const NOTIFICATION_CATEGORIES = {
  match_reminder: {
    actions: [
      { action: 'view', title: '👀 Anzeigen' },
      { action: 'snooze', title: '⏰ Später' },
    ],
    vibrate: [100, 50, 100, 50, 100],
  },
  match_result: {
    actions: [
      { action: 'view', title: '🏆 Details' },
      { action: 'share', title: '📤 Teilen' },
    ],
    vibrate: [200, 100, 200],
  },
  tournament_start: {
    actions: [
      { action: 'view', title: '🎮 Los geht\'s!' },
    ],
    vibrate: [100, 50, 100, 50, 100, 50, 100],
  },
  player_joined: {
    actions: [
      { action: 'view', title: '👋 Lobby' },
    ],
    vibrate: [50, 50],
  },
  tournament_finished: {
    actions: [
      { action: 'view', title: '🏆 Ergebnisse' },
      { action: 'share', title: '📤 Teilen' },
    ],
    vibrate: [200, 100, 200, 100, 200],
  },
  default: {
    actions: [
      { action: 'view', title: 'Anzeigen' },
      { action: 'dismiss', title: 'Schließen' },
    ],
    vibrate: [100, 50, 100],
  },
};

/**
 * Push Notification Handler
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const category = NOTIFICATION_CATEGORIES[data.category] || NOTIFICATION_CATEGORIES.default;

    const options = {
      body: data.message || data.body,
      icon: data.icon || '/icon.png',
      badge: '/icon.png',
      image: data.image, // Large image for rich notifications
      vibrate: category.vibrate,
      tag: data.tag || `bierpong-${data.category || 'notification'}`,
      renotify: data.renotify !== false,
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      timestamp: data.timestamp || Date.now(),
      data: {
        dateOfArrival: Date.now(),
        url: data.link || data.url || '/',
        category: data.category,
        tournamentId: data.tournamentId,
        matchId: data.matchId,
        payload: data.payload,
      },
      actions: data.actions || category.actions,
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
  const action = event.action;
  const data = event.notification.data || {};
  const url = data.url || '/';

  // Handle different actions
  switch (action) {
    case 'dismiss':
      event.notification.close();
      return;

    case 'snooze':
      event.notification.close();
      // Re-show notification after 5 minutes
      event.waitUntil(
        new Promise((resolve) => {
          setTimeout(() => {
            self.registration.showNotification(event.notification.title, {
              body: event.notification.body,
              icon: event.notification.icon,
              badge: event.notification.badge,
              data: data,
              tag: `${event.notification.tag}-snoozed`,
              actions: event.notification.actions,
            });
            resolve();
          }, 5 * 60 * 1000)
        })
      );
      return;

    case 'share':
      event.notification.close();
      // Navigate to tournament with share param
      const shareUrl = data.tournamentId
        ? `/tournaments/${data.tournamentId}?share=true`
        : url;
      event.waitUntil(navigateToUrl(shareUrl));
      return;

    case 'view':
    default:
      event.notification.close();
      event.waitUntil(navigateToUrl(url));
      return;
  }
});

/**
 * Notification Close Handler (swipe away)
 */
self.addEventListener('notificationclose', (event) => {
  // Track dismissed notifications if needed
  console.log('[SW] Notification dismissed:', event.notification.tag);
});

/**
 * Navigate to URL - focus existing window or open new
 */
async function navigateToUrl(url) {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Focus existing window if available
  for (const client of windowClients) {
    if (client.url.includes(self.location.origin) && 'focus' in client) {
      await client.navigate(url);
      return client.focus();
    }
  }

  // Open new window
  return clients.openWindow(url);
}

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
