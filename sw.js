// Service Worker — INTROS Console
// Bump CACHE_VERSION sempre que trocar arquivos (força re-download)
const CACHE_VERSION = 'intros-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './intro-preshow.mp3',
  './intro-album.mp3',
  './intro-ficcao.mp3'
];

// Instala e baixa tudo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Limpa caches antigos (v1, v2…) quando o novo SW ativa
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Cache-first: serve do cache, cai pra rede se não tiver
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((res) => {
          // Cacheia a resposta pra próxima vez (útil em dev)
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(event.request, copy));
          return res;
        })
      );
    })
  );
});
