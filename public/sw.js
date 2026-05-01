// Service Worker minimale Genius Lab Dashboard
// - Cache statica per assets pubblici
// - Network-first per API, cache fallback per offline base
// - Prepara hook per push notifications (FUTURE: VAPID setup)

const CACHE_NAME = 'genius-lab-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Network-first per API e auth
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  // Cache-first per static assets
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Push notification handler con vibration + actions
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Genius Lab', body: event.data.text() };
  }
  const title = payload.title || 'Genius Lab';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: payload.image,
    data: { url: payload.url || '/dashboard/chat', timestamp: Date.now() },
    vibrate: [200, 100, 200, 100, 200],
    tag: payload.tag || 'genius-lab-chat',
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open', title: '👀 Apri' },
      { action: 'dismiss', title: '✕ Ignora' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const targetUrl = event.notification.data?.url || '/dashboard/chat';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Se la dashboard è già aperta in un tab, focusla
      for (const client of clients) {
        if (client.url.includes('genius-lab-dashboard') && 'focus' in client) {
          return client.focus().then((c) => c.navigate?.(targetUrl));
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
