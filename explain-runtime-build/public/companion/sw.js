// Companion prototype service worker.
// Scope is restricted to /companion/ so it never touches production routes.
// Purpose: satisfy PWA installability checks for the prototype only. No offline
// caching guarantees are made here — this is a proof surface, not a production
// offline strategy.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(
      () => new Response("Companion prototype is offline.", { status: 503, statusText: "Offline" })
    )
  );
});
