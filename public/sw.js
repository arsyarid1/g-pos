const CACHE_NAME = 'gastropos-pwa-v2.1';

// Aset dasar yang harus langsung dicache saat instalasi service worker
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/icon.svg'
];

// 1. Event Install: Pre-cache asset statis inti & langsung ambil alih
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[PWA SW] Precache partial error:', err);
        });
      })
  );
});

// 2. Event Activate: Bersihkan seluruh cache versi lama & klaim kontrol klien
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('[PWA SW] Menghapus cache versi lama:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Event Fetch: Network-First dengan Cache Fallback untuk menjamin versi terbaru selalu aktif
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Hanya tangani HTTP / HTTPS GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jangan sentuh atau cache request ke Supabase API (biarkan Dexie lokal memproses saat offline)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Network-First Strategy:
  // Coba ambil versi terbaru dari jaringan terlebih dahulu.
  // Jika berhasil, simpan salinan ke cache.
  // Jika offline / gagal, gunakan versi cache lokal.
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Hanya cache file dari origin yang sama
            if (url.origin === self.location.origin) {
              cache.put(request, clone);
            }
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback offline dari cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        // Jika navigasi SPA dan offline, kembalikan cached index.html
        if (request.mode === 'navigate') {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return caches.match('/');
        }

        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});
