const CACHE_NAME = "inspecciones-shell-v2";
const CACHE_PREFIX = "inspecciones-shell-";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.svg",
  "/icon-512.svg"
];
const STATIC_PREFIX = "/_next/static/";
// Nunca se cachean: datos de la API y el propio service worker.
const EXCLUDED_PREFIXES = ["/api/"];
const EXCLUDED_PATHS = ["/sw.js"];

function logError(context, error) {
  console.error(`[sw] ${context}`, error);
}

function isCacheable(response, request) {
  if (!response || !response.ok || response.type === "opaque") return false;
  if (request.mode === "navigate") return true;
  // Respeta la petición del servidor de no guardar contenido sensible.
  return !/no-store|private/i.test(response.headers.get("cache-control") || "");
}

async function store(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  } catch (error) {
    logError("No se pudo guardar en caché", error);
  }
}

async function networkFirst(event) {
  const { request } = event;
  try {
    const response = await fetch(request);
    if (isCacheable(response, request)) event.waitUntil(store(request, response.clone()));
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      return (await caches.match(OFFLINE_URL)) || (await caches.match("/")) || Promise.reject(error);
    }
    logError(`Sin red ni caché para ${request.url}`, error);
    throw error;
  }
}

async function cacheFirst(event) {
  const { request } = event;
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheable(response, request)) event.waitUntil(store(request, response.clone()));
    return response;
  } catch (error) {
    logError(`Recurso no disponible offline: ${request.url}`, error);
    throw error;
  }
}

self.addEventListener("install", (event) => {
  // addAll es atómico: si un recurso falla no se instala una caché incompleta.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((error) => {
        logError("Falló la precarga del shell", error);
        throw error;
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .catch((error) => logError("Falló la activación", error))
  );
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(
          keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key))
        ))
        .catch((error) => logError("Falló la invalidación de caché", error))
    );
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (EXCLUDED_PATHS.includes(requestUrl.pathname)) return;
  if (EXCLUDED_PREFIXES.some((prefix) => requestUrl.pathname.startsWith(prefix))) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event));
  } else if (requestUrl.pathname.startsWith(STATIC_PREFIX)) {
    // Archivos con hash en el nombre: son inmutables, seguros para Cache First.
    event.respondWith(cacheFirst(event));
  } else {
    event.respondWith(networkFirst(event));
  }
});
