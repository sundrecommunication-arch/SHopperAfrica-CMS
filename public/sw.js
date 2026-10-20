// Shopper seller app service worker. Deliberately small:
// - Pages always come from the network (orders and stock must be live, and
//   dashboard pages are private), with a friendly offline page when there's
//   no connection instead of the browser's error screen.
// - Next.js's build assets (content-hashed, so safe forever) and the app
//   icons are cached for fast, reliable starts.
// Nothing user-specific is ever stored in the cache.
const VERSION = "v1";
const STATIC_CACHE = `shopper-static-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("shopper-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Re-save the offline page once per service-worker start while online, so
// after a new deploy it matches the current build.
let offlineRefreshed = false;
function refreshOfflinePage() {
  if (offlineRefreshed) return;
  offlineRefreshed = true;
  caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {});
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Customers' storefront pages are left to the browser: this offline page
  // is written for sellers.
  if (url.pathname.startsWith("/store/")) return;

  // Page loads: network first, offline page if the network is down.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          refreshOfflinePage();
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Hashed build assets and icons: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
  // Everything else (API calls, data, images) goes straight to the network.
});
