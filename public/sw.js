const CACHE_NAME = "soul-journal-v4";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [
  "/",
  "/index.html",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

const shouldBypass = (requestUrl) => {
  const path = requestUrl.pathname;

  return (
    path.startsWith("/~oauth") ||
    path.startsWith("/auth/v1") ||
    path.startsWith("/rest") ||
    path.startsWith("/storage") ||
    path.startsWith("/functions") ||
    requestUrl.hostname.includes("supabase.co")
  );
};

const putInCache = async (request, response) => {
  if (!response || response.status !== 200 || response.type === "opaque") {
    return response;
  }

  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin || shouldBypass(requestUrl)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache(request, response))
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || caches.match("/") || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  if (/\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ttf)$/i.test(requestUrl.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => putInCache(request, response));
      })
    );
  }
});