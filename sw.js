// Cachea la app para que abra sin señal. Las llamadas al Sheet no pasan por acá (son de otro origen).
// Estrategia: primero la red (así una versión nueva se ve al abrir), y la copia guardada solo si no hay señal.
const V = 'gastos-v24';
const LIB = ['lib/pdf.min.js', 'lib/pdf.worker.min.js'];   // lector de PDF: se guarda aparte para que sin él igual se instale la app
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  // 'reload' salta la caché HTTP del navegador para no guardar archivos viejos
  e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))
    .then(() => Promise.allSettled(LIB.map(u => c.add(new Request(u, { cache: 'reload' })))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  const cached = () => caches.match(req, { ignoreSearch: true });
  const fresh = fetch(req.url, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); }
    return r;
  });
  const timeout = new Promise(res => setTimeout(() => res(null), 3000));   // con mala señal, usa la copia guardada
  e.respondWith(Promise.race([fresh, timeout]).then(r => r || cached().then(h => h || fresh)).catch(() => cached()));
});
