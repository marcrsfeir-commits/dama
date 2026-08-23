// Dama — offline service worker
const CACHE = 'dama-v101';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './music.mp3', './music-oud.mp3', './music-lofi.mp3', './music-zen.mp3', './towers/bg-galaxy.jpg', './towers/bg-jungle.jpg', './towers/bg-serpent.jpg', './towers/bg-lightning.jpg', './towers/bg-throne.jpg'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).catch(function () {}));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var accept = (req.headers.get('accept') || '');
  var isPage = req.mode === 'navigate' || accept.indexOf('text/html') !== -1;

  if (isPage) {
    // Network-first for the page: always try to get the latest when online,
    // fall back to the cached copy (offline / airplane mode).
    e.respondWith(
      fetch(req).then(function (res) {
        // Keep BOTH the visited URL and the offline-fallback (./index.html and ./) fresh on every online load,
        // so an offline reopen always serves the latest build — not a stale copy from first install.
        try { var c1 = res.clone(), c2 = res.clone(), c3 = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, c1); c.put('./index.html', c2); c.put('./', c3); }).catch(function () {});
        } catch (err) {}
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match('./index.html') || caches.match('./'); });
      })
    );
    return;
  }

  // Cache-first for everything else (icons, manifest) — fast, and rarely changes.
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
