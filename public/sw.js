// Self-destructing, cache-purging Service Worker to heal browsers trapped by old cache strategies
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      })
      .then(() => {
        return self.clients.claim();
      })
      .then(() => {
        console.log("Service Worker self-destruct sequence complete: Caches cleared.");
        return self.registration.unregister();
      })
  );
});
