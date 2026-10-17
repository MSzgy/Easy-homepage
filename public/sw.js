// v2: pages are network-first so new releases show up immediately; only hashed
// build assets are cache-first. Bumping the name clears the v1 cache-first cache.
const CACHE_NAME = "mosu-homepage-v2";
const CORE_ASSETS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

const putInCache = (request, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => putInCache(request, response))));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => putInCache(request, response))
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});
