// Service worker Send By Me.
// Règle de confidentialité : les pages HTML ne sont jamais mises en cache (elles peuvent contenir
// des données personnelles). Seuls les fichiers statiques publics le sont, plus une page hors ligne.

const VERSION = "sbm-v3";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/hors-ligne";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png", "/icon.svg"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Photos publiques du site redimensionnées par Next.js (jamais les photos de membres ni les documents).
function isPublicOptimizedImage(url) {
  if (url.pathname !== "/_next/image") return false;
  const src = url.searchParams.get("url") || "";
  return src.startsWith("/images/") || src.startsWith("/brand/") || src.startsWith("/_next/static/media/");
}

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/") || url.pathname.startsWith("/icons/") || isPublicOptimizedImage(url))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Navigation : toujours le réseau ; page hors ligne si la connexion manque.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Fichiers statiques versionnés : cache d'abord.
  if (isStaticAsset(url)) {
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
          }),
      ),
    );
  }
});

// Notifications push (réservation, paiement, colis, messages)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Send By Me", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Send By Me", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/espace" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/espace", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin));
      if (open) return open.navigate(url).then((c) => c && c.focus());
      return self.clients.openWindow(url);
    }),
  );
});
