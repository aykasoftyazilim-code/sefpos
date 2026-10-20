/** VDS migration: eski cache-first SW'yi kaldırır. Sadece VDS deploy'da sw.js olarak kopyalanır. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        try {
          if ('navigate' in client) await client.navigate(client.url);
          else client.postMessage({ type: 'SEFPOS_SW_KILLED' });
        } catch {
          /* ignore */
        }
      }
    })()
  );
});

self.addEventListener('fetch', () => {});
