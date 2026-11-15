// Service worker de Alacena.
// Guarda la app para abrir sin conexión. Cada versión usa su propia caché y los archivos se piden
// sin la caché HTTP; la versión nueva espera a que el usuario toque «Actualizar».
const VERSION = 'v0.0.1';
const CANAL = new URL(self.registration.scope).pathname.includes('/prueba/') ? 'dev' : 'real';
const CACHE = `alacena-${CANAL}-${VERSION}`;
const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/app.css',
  'fuentes/figtree.woff2',
  'iconos/icono.svg',
  'iconos/icono-32.png',
  'iconos/icono-192.png',
  'iconos/icono-512.png',
  'iconos/icono-maskable-512.png',
  'manifest-prueba.webmanifest',
  'iconos/prueba/icono.svg',
  'iconos/prueba/icono-32.png',
  'iconos/prueba/icono-192.png',
  'iconos/prueba/icono-512.png',
  'iconos/prueba/icono-maskable-512.png',
  'iconos/prueba/icono-maskable.svg',
  'src/adaptadores/actualizaciones.js',
  'src/adaptadores/almacen-indexeddb.js',
  'src/adaptadores/canal.js',
  'src/adaptadores/drive-sync.js',
  'src/adaptadores/google-auth.js',
  'src/adaptadores/instalacion-navegador.js',
  'src/adaptadores/preferencias-local.js',
  'src/adaptadores/reloj.js',
  'src/adaptadores/tema-temprano.js',
  'src/aplicacion/datos-dispositivo.js',
  'src/aplicacion/instalacion.js',
  'src/aplicacion/modo-prueba.js',
  'src/aplicacion/preferencias.js',
  'src/arranque.js',
  'src/dominio/configuracion.js',
  'src/dominio/fecha.js',
  'src/dominio/formato.js',
  'src/dominio/instalacion.js',
  'src/dominio/tema.js',
  'src/dominio/texto.js',
  'src/puertos/almacen.js',
  'src/puertos/instalacion.js',
  'src/puertos/preferencias.js',
  'src/puertos/reloj.js',
  'src/puertos/sincronizacion.js',
  'src/ui/app.js',
  'src/ui/dialogo.js',
  'src/ui/dom.js',
  'src/ui/franja-prueba.js',
  'src/ui/instalacion.js',
  'src/ui/pantallas/ajustes.js',
  'src/ui/pantallas/proximamente.js',
  'src/version.js',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS.map((archivo) => new Request(archivo, { cache: 'no-cache' })))));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((c) => c.startsWith(`alacena-${CANAL}-`) && c !== CACHE).map((c) => caches.delete(c))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'actualizar') self.skipWaiting();
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  const alcance = new URL(self.registration.scope);
  if (url.origin !== alcance.origin || !url.pathname.startsWith(alcance.pathname)) return;
  // La versión a probar (/prueba/) tiene su propio service worker: el de la versión real no la toca.
  if (url.pathname.startsWith(`${alcance.pathname}prueba/`)) return;
  const esLaApp = pedido.mode === 'navigate' && (url.pathname === alcance.pathname || url.pathname === `${alcance.pathname}index.html`);
  const buscar = esLaApp ? caches.match(new URL('./', alcance).href) : caches.match(pedido, { ignoreSearch: true });
  evento.respondWith(buscar.then((guardado) => guardado || fetch(pedido)));
});
