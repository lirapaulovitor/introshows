// INTROS — service worker
// "Rede primeiro": com internet, sempre pega a versão mais nova do GitHub.
// Sem internet, usa a última cópia guardada.
var CACHE = 'introshows-v2';
var FILES = [
  './', 'index.html', 'manifest.json',
  'intro-album.mp3', 'chamadointro.mp3', 'intro-ficcao.mp3', 'intro-preshow.mp3'
];

self.addEventListener('install', function (e) {
  // guarda cada arquivo separadamente: se um faltar, os outros continuam
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return c.add(new Request(f, { cache: 'reload' })).catch(function () {});
    }));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  // apaga os caches antigos (é isso que destrava a versão velha no celular)
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                           .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// sem internet, responde pedidos de áudio "por partes" a partir da cópia inteira
function rangeFromCache(req) {
  return caches.match(req.url, { ignoreSearch: true }).then(function (res) {
    if (!res) return Response.error();
    return res.blob().then(function (blob) {
      var m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
      var start = m && m[1] ? parseInt(m[1], 10) : 0;
      var end = m && m[2] ? parseInt(m[2], 10) : blob.size - 1;
      return new Response(blob.slice(start, end + 1), {
        status: 206,
        headers: {
          'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
          'Content-Range': 'bytes ' + start + '-' + end + '/' + blob.size,
          'Content-Length': String(end - start + 1),
          'Accept-Ranges': 'bytes'
        }
      });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  if (req.headers.has('range')) {
    e.respondWith(fetch(req).catch(function () { return rangeFromCache(req); }));
    return;
  }

  e.respondWith(
    fetch(req).then(function (res) {
      if (res.ok && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true });
    })
  );
});
