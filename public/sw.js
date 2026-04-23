const SCOPE_URL = new URL("./", self.location.href);
const OFFLINE_URL = new URL("offline.html", SCOPE_URL).toString();
const APP_SHELL = [
  new URL(".", SCOPE_URL).toString(),
  OFFLINE_URL,
  new URL("manifest.webmanifest", SCOPE_URL).toString(),
  new URL("icon.svg", SCOPE_URL).toString(),
  new URL("data/library.packs.json", SCOPE_URL).toString(),
  new URL("data/library.stats.json", SCOPE_URL).toString(),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("helixcanvas-app-v2").then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== "helixcanvas-app-v2")
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open("helixcanvas-app-v2").then((cache) => cache.put(request, responseClone));
          }

          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open("helixcanvas-app-v2").then((cache) => cache.put(request, responseClone));
          }

          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkResponse;
    }),
  );
});
