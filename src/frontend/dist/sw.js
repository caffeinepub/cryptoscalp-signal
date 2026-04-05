// CryptoScalp Service Worker

self.addEventListener('install', (event) => {
  // Force activation immediately without waiting for old SW to be replaced
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all open clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'CryptoScalp', {
      body: data.body || 'Nuovo segnale LONG rilevato',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'cryptoscalp-signal',
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
