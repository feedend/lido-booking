// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Questo evento fetch è obbligatorio per attivare il prompt di installazione PWA
self.addEventListener('fetch', (event) => {
  // Logica offline minimale (lascia passare le richieste normalmente)
  event.respondWith(fetch(event.request));
});
