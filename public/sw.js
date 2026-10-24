/* BridgeConnect service worker.
 *
 * Deliberately conservative: pages are per-user and must never be served from cache to someone else, so
 * navigations always go to the network and fall back to a static offline page. Only immutable build assets,
 * icons and public Supabase media are cached. Non-GET requests, auth, API and back-office routes are never
 * touched.
 */
const VERSION = "v2";
const STATIC_CACHE = `bc-static-${VERSION}`;
const MEDIA_CACHE = `bc-media-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];
const MEDIA_LIMIT = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, MEDIA_CACHE]);
      for (const key of await caches.keys()) {
        if (key.startsWith("bc-") && !keep.has(key)) await caches.delete(key);
      }
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        cache.put(event.request, response.clone()).then(() => trim(MEDIA_CACHE, MEDIA_LIMIT));
      }
      return response;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      event.respondWith(
        (async () => {
          try {
            const preloaded = await event.preloadResponse;
            return preloaded || (await fetch(request));
          } catch {
            return (await caches.match(OFFLINE_URL)) || Response.error();
          }
        })(),
      );
      return;
    }
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  // Public images: Cloudinary delivery URLs and public Supabase Storage objects. Private buckets use signed
  // URLs and are skipped.
  if (url.hostname === "res.cloudinary.com" || url.pathname.includes("/storage/v1/object/public/")) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
