/* Service worker BQ-ku.
 * Prinsip: DATA TIDAK PERNAH DISIMPAN DI SINI. Yang di-cache hanya kerangka statis
 * (JS/CSS/font/ikon) + halaman offline. /api/* dan halaman berisi data selalu ke jaringan.
 * Ganti VERSI bila isi PRECACHE berubah.
 */
const VERSI = 'v1';
const CACHE_STATIS = `bq-statis-${VERSI}`;
const HALAMAN_OFFLINE = '/offline.html';
const PRECACHE = [HALAMAN_OFFLINE, '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_STATIS).then((c) => c.addAll(PRECACHE)));
  // Tidak skipWaiting otomatis: aplikasi yang menampilkan "Versi baru tersedia" lalu mengirim pesan.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nama = await caches.keys();
    await Promise.all(nama.filter((n) => n.startsWith('bq-') && n !== CACHE_STATIS).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/** Aset berversi hash/tetap — aman cache-first. */
function asetStatis(url) {
  return url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/icons/')
    || /\.(?:woff2?|ttf|otf)$/.test(url.pathname)
    || url.pathname === '/favicon.ico';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // data: selalu jaringan, tanpa cache

  // Navigasi halaman: selalu jaringan (data segar). Gagal (offline) → halaman offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(async () => (await caches.match(HALAMAN_OFFLINE)) || Response.error()));
    return;
  }

  if (asetStatis(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_STATIS);
      const ada = await cache.match(req);
      if (ada) return ada;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    })());
  }
  // Lainnya (RSC payload, gambar dinamis, dll.): biarkan browser menangani seperti biasa.
});
