/* ── Alfa Glass — Service Worker ── */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* Recebe notificação push e exibe */
self.addEventListener('push', event => {
  let data = { title: 'Alfa Glass', body: 'Nova notificação', url: '/melo/dashboard', tag: 'melo' };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/alfaglass-icon.png',
      badge: '/alfaglass-icon.png',
      tag: data.tag,
      data: { url: data.url },
      requireInteraction: false,
      silent: false,
    })
  );
});

/* Ao clicar na notificação, abre o app */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/melo/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/melo') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
