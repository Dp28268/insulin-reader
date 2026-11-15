/*
  Service worker: makes Insulin Check work offline after the first visit.
  Strategy: serve from cache immediately (fast on slow networks), and refresh
  the cache in the background when online, so updates appear on the next open.
  Bump CACHE_VERSION if you add or rename files below.
*/
var CACHE_VERSION = "insulin-check-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Page loads (including ?team) all use the cached index.html.
  var isPage = req.mode === "navigate";
  var cacheKey = isPage ? new URL("./index.html", self.location).href : req;

  event.respondWith(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.match(cacheKey, { ignoreSearch: true }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(cacheKey, res.clone());
          return res;
        }).catch(function () { return cached; });
        if (cached) { event.waitUntil(network); return cached; }
        return network;
      });
    })
  );
});
