const ISOLATION_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin'
};
const PRECACHE_ENTRIES = self.__WB_MANIFEST;
const CACHE_NAME = `rawcket-app-shell-${precacheVersion(PRECACHE_ENTRIES)}`;
const PRECACHE_URLS = PRECACHE_ENTRIES.map((entry) => new URL(entry.url, self.registration.scope).href);
const PRECACHE_URL_SET = new Set(PRECACHE_URLS);
const FALLBACK_URL = new URL('index.html', self.registration.scope).href;

function precacheVersion(entries) {
  const identity = entries.map((entry) => `${entry.url}:${entry.revision ?? ''}`).join('|');
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function withIsolationHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(ISOLATION_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  });
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(PRECACHE_URLS);
  const requests = await cache.keys();
  await Promise.all(requests
    .filter((request) => !PRECACHE_URL_SET.has(request.url))
    .map((request) => cache.delete(request)));
}

async function isolatedNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) return withIsolationHeaders(response);
  } catch {
    // The versioned application shell below is the intentional offline fallback.
  }
  const cached = await caches.match(FALLBACK_URL);
  return cached === undefined
    ? Response.error()
    : withIsolationHeaders(cached);
}

async function isolatedAsset(request) {
  const cached = await caches.match(request);
  return withIsolationHeaders(cached ?? await fetch(request));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await cacheAppShell();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('rawcket-app-shell-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(isolatedNavigation(event.request));
    return;
  }
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) event.respondWith(isolatedAsset(event.request));
});
