/* RESPAWN service worker: caches the app shell so it opens offline. No user data is cached here. */
var CACHE = 'respawn-shell-v1';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'icons/icon.svg', 'icons/icon-maskable.svg',
  'js/games.js', 'js/matching.js', 'js/data.js', 'js/store.js', 'js/ui.js', 'js/screens1.js', 'js/screens2.js', 'js/screens3.js', 'js/app.js'];

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
  }).catch(function () { return caches.match(e.request).then(function (hit) { return hit || caches.match('index.html'); }); }));
});
