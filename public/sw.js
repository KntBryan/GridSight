/**
 * GridSight Progressive Web App (PWA) Service Worker
 *
 * Provides:
 * - App shell caching for resilient offline rendering
 * - Stale-while-revalidate / cache-first asset loading
 * - Background Web Push notification delivery and click handling
 */

const CACHE_NAME = "gridsight-shell-v1";
const RUNTIME_CACHE = "gridsight-runtime-v1";
const APP_SHELL = ["/"];

/**
 * Service Worker install event.
 * Caches core app shell assets and activates immediately via `skipWaiting()`.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

/**
 * Service Worker activate event.
 * Cleans up outdated cache generations and claims active browser clients.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

/**
 * Service Worker fetch event.
 * - Navigation requests: Network-first with offline fallback to cached app shell.
 * - Static assets (scripts, styles, fonts): Cache-first with background network caching.
 * - API routes and non-GET requests bypass the service worker cache.
 */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
      return response;
    }).catch(async () => (await caches.match("/")) || Response.error()));
    return;
  }

  if (["script", "style", "font"].includes(event.request.destination)) {
    event.respondWith(caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }).catch(async () => (await caches.match(event.request)) || Response.error()));
  }
});

/**
 * Web Push notification event.
 * Receives incoming push payloads and displays native system notifications.
 */
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "GridSight update", body: "An outage in your area changed." };
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon.svg",
    data: { url: data.url || "/" },
  }));
});

/**
 * Notification click event handler.
 * Closes the clicked notification and navigates/focuses the target app route.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/"));
});
