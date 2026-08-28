// assets/js/service-worker.js
/**
 * Service Worker for GetUpDeals – PWA offline caching,
 * asset optimization, and fallback pages.
 */
const CACHE_NAME = 'getupdeals-v1';
const STATIC_CACHE = 'static-v1';
const DATA_CACHE = 'data-v1';
const IMAGES_CACHE = 'images-v1';

// Assets to cache on install (critical for offline)
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/critical.css',
  './assets/css/main.css',
  './assets/css/components.css',
  './assets/css/themes.css',
  './assets/css/responsive.css',
  './assets/js/main.js',
  './assets/js/theme-switcher.js',
  './assets/js/navigation.js',
  './assets/js/cookie-consent.js',
  './assets/js/optimizations.js',
  './assets/js/analytics.js',
  './assets/images/logo/logo-g.png',
  './assets/images/logo/logo-full.svg',
  './assets/images/placeholders/deal.jpg',
  './assets/images/fallback-deal.jpg',
  './assets/fonts/Inter/Inter.woff2',
  './assets/fonts/Poppins/Poppins.woff2',
  './offline.html' // you may create a simple offline page
];

// API endpoints to cache dynamically
const API_URLS = [
  './api/deals/get-deals.php',
  './api/blog/get-posts.php',
  './assets/data/deals.json',
  './assets/data/posts.json',
  './assets/data/categories.json'
];

// Install event – cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event – clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  const currentCaches = [STATIC_CACHE, DATA_CACHE, IMAGES_CACHE, CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
      })
      .then(cachesToDelete => {
        return Promise.all(cachesToDelete.map(cacheToDelete => {
          console.log('[Service Worker] Deleting old cache:', cacheToDelete);
          return caches.delete(cacheToDelete);
        }));
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event – serve from cache or network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const requestUrl = event.request.url;

  // Skip cross-origin requests (like images from CDN)
  if (url.origin !== self.location.origin) {
    // For images from external sources, try cache-first but don't block
    if (event.request.destination === 'image') {
      event.respondWith(
        caches.open(IMAGES_CACHE).then(cache => {
          return cache.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            return fetch(event.request).then(networkResponse => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          });
        })
      );
      return;
    }
    // For other external resources, just fetch (no cache)
    return;
  }

  // Handle API requests (data) – network first, fallback to cache
  if (API_URLS.some(apiUrl => requestUrl.includes(apiUrl))) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Cache a copy of the response
          const responseClone = networkResponse.clone();
          caches.open(DATA_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache, return a fallback (empty data)
            return new Response(JSON.stringify({ deals: [], posts: [] }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Handle static assets (CSS, JS, fonts, images) – cache first
  if (
    event.request.destination === 'style' ||
    event.request.destination === 'script' ||
    event.request.destination === 'font' ||
    event.request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          // Cache new requests for future offline
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // For HTML pages (navigations) – network first, fallback to cache, then offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Cache the page for later offline
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then(cachedPage => {
            if (cachedPage) return cachedPage;
            // If page not in cache, return offline page
            return caches.match('./offline.html');
          });
        })
    );
    return;
  }

  // Default: network, don't cache
  event.respondWith(fetch(event.request));
});