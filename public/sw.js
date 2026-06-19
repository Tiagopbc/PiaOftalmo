const CACHE_NAME = 'pia-oftalmo-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => console.log('Erro ao pré-cachear assets:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const requestUrl = new URL(e.request.url);

  // Ignorar requisições que não são GET (como POST, PUT, DELETE)
  // e requisições para APIs externas como o Supabase
  if (e.request.method !== 'GET' || requestUrl.hostname.includes('supabase.co')) {
    return;
  }

  // Nunca cachear o servidor de desenvolvimento. Isso evita versões antigas
  // dos componentes durante testes no localhost.
  if (requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1') {
    e.respondWith(
      fetch(e.request).catch(() => new Response(null, { status: 503, statusText: 'Offline' }))
    );
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then(res => res || new Response('Offline', { status: 503, statusText: 'Offline' })))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        // Não salvar requisições de API externas ou dinâmicas no cache estático
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Apenas cacheia recursos locais estáticos
          if (e.request.url.startsWith(self.location.origin) && !e.request.url.includes('hot-update')) {
            cache.put(e.request, responseToCache);
          }
        });
        
        return response;
      }).catch(() => {
        // Fallback offline para navegações principais
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html').then(res => res || new Response('Offline', { status: 503, statusText: 'Offline' }));
        }
        return new Response(null, { status: 503, statusText: 'Offline' });
      });
    })
  );
});
