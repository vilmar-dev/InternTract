const CACHE_NAME = "interntrack-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",

  "./login.html",
  "./login.css",
  "./login.js",

  "./intern.html",
  "./intern.css",
  "./intern.js",

  "./admin.html",
  "./admin.css",
  "./admin.js",

  "./register.html",
  "./register.js",

  "./pending.html",

  "./auth.js",
  "./firebase.js",
  "./utils.js",

  "./manifest.json",
  "./macro.png",

  "./interntrack-icon-192x192.png",
  "./interntrack-icon-512x512.png"
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});