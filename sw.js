/* RESPAWN service worker: caches the app shell so it opens offline. No user data is cached here. */
var CACHE = 'respawn-shell-v3-flat';
var SHELL_PATHS = ['./', 'index.html', 'manifest.webmanifest', 'respawn-css-styles.css', 'respawn-icons-icon.svg', 'respawn-icons-icon-maskable.svg',
  'respawn-js-games.js', 'respawn-js-matching.js', 'respawn-js-data.js', 'respawn-js-store.js', 'respawn-js-ui.js', 'respawn-js-screens1.js', 'respawn-js-screens2.js', 'respawn-js-screens3.js', 'respawn-js-app.js'];
var SHELL = SHELL_PATHS.map(function (path) { return new URL(path, self.registration.scope).href; });
var INDEX_URL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
    return res;
  }).catch(function () { return caches.match(e.request).then(function (hit) { return hit || (e.request.mode === 'navigate' ? caches.match(INDEX_URL) : Promise.resolve(undefined)); }); }));
});
