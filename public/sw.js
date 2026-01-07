// Minimal Service Worker to satisfy PWA install requirements
// In a real app, you'd want caching strategies here.

const CACHE_NAME = 'lunch-o-matic-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Just a pass-through for now, but required for "offline capability" check 
    // in some PWA validators (even if it doesn't actually cache much yet).
    // Ideally, we cache the app shell.
    event.respondWith(fetch(event.request).catch(() => {
        // Offline fallback could go here
        return new Response("Offline - Check connection");
    }));
});
