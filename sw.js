// Dama — offline service worker
const CACHE = 'dama-v107';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './music.mp3', './music-oud.mp3', './music-lofi.mp3', './music-zen.mp3', './towers/map.jpg', './towers/tw1-1.jpg', './towers/tw1-2.jpg', './towers/tw1-3.jpg', './towers/tw1-4.jpg', './towers/tw1-5.jpg', './towers/tw2-1.jpg', './towers/tw2-2.jpg', './towers/tw2-3.jpg', './towers/tw2-4.jpg', './towers/tw2-5.jpg', './towers/tw2-6.jpg', './towers/tw2-7.jpg', './towers/tw3-1.jpg', './towers/tw3-2.jpg', './towers/tw3-3.jpg', './towers/tw3-4.jpg', './towers/tw3-5.jpg', './towers/tw3-6.jpg', './towers/tw3-7.jpg', './towers/tw3-8.jpg', './towers/tw3-9.jpg', './towers/tw3-10.jpg', './towers/tw4-1.jpg', './towers/tw4-2.jpg', './towers/tw4-3.jpg', './towers/tw4-4.jpg', './towers/tw4-5.jpg', './towers/tw4-6.jpg', './towers/tw4-7.jpg', './towers/tw4-8.jpg', './towers/tw4-9.jpg', './towers/tw4-10.jpg', './towers/tw4-11.jpg', './towers/tw4-12.jpg', './towers/tw4-13.jpg', './towers/tw4-14.jpg', './towers/tw4-15.jpg', './towers/tower1.jpg', './towers/tower2.jpg', './towers/tower3.jpg', './towers/tower4.jpg'];

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
      fetch(req.url, { cache: 'no-store' }).then(function (res) {
        // no-store bypasses the browser HTTP cache (GitHub Pages caches HTML ~10min) so a reload ALWAYS gets the newest build.
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
