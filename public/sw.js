const CACHE_NAME = "sentinel-shell-v4";
const ALERT_CONFIG_URL = "/__sentinel_alert_config__";
const APP_SHELL = ["/logo.png", "/favicon.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
    return;
  }
  if (url.pathname.startsWith("/api/geocoding/")) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(fetch(event.request).then((response) => {
    if (
      response.ok
      && (url.pathname === "/api/incidents/firms" || url.pathname === "/api/weather/wind")
    ) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    return Response.json({ message: "Ressource indisponible hors ligne." }, { status: 503 });
  }));
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "sentinel-alert-config") return;
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(
    ALERT_CONFIG_URL,
    new Response(JSON.stringify(event.data.config), { headers: { "Content-Type": "application/json" } }),
  )));
});

function distanceKm(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLatitude = radians(second.latitude - first.latitude);
  const deltaLongitude = radians(second.longitude - first.longitude);
  const value = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude))
    * Math.sin(deltaLongitude / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function checkBackgroundAlerts() {
  const cache = await caches.open(CACHE_NAME);
  const stored = await cache.match(ALERT_CONFIG_URL);
  if (!stored) return;
  const config = await stored.json();
  if (!config.enabled || !Number.isFinite(config.latitude) || !Number.isFinite(config.longitude)) return;
  const response = await fetch("/api/incidents/firms", { cache: "no-store" });
  if (!response.ok) return;
  const payload = await response.json();
  const nearby = (payload.incidents || []).filter((incident) =>
    new Date(incident.observedAt).getTime() > config.checkedAt
    && distanceKm(config, incident) <= config.radiusKm);
  config.checkedAt = Date.now();
  await cache.put(ALERT_CONFIG_URL, new Response(JSON.stringify(config), { headers: { "Content-Type": "application/json" } }));
  if (!nearby.length) return;
  const nearest = nearby.reduce((selected, incident) =>
    distanceKm(config, incident) < distanceKm(config, selected) ? incident : selected);
  await self.registration.showNotification("Nouvelle activité thermique à proximité", {
    body: `${nearby.length} nouveau(x) signal(aux) dans un rayon de ${config.radiusKm} km autour de ${config.label}. Le plus proche est à ${Math.round(distanceKm(config, nearest))} km.`,
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: `/?lat=${nearest.latitude}&lon=${nearest.longitude}&zoom=12` },
    tag: "sentinel-nearby-fire",
  });
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "sentinel-check-fire-alerts") event.waitUntil(checkBackgroundAlerts());
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(payload.title || "Alerte Sentinel", {
    body: payload.body || "Une nouvelle activité thermique a été détectée.",
    icon: "/icon.svg",
    data: { url: payload.url || "/" },
    tag: payload.tag || "sentinel-push",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients[0];
    if (existing) {
      existing.navigate(url);
      return existing.focus();
    }
    return self.clients.openWindow(url);
  }));
});
