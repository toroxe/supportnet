// MySupportNet service worker
// Version: 2026.10.06-01
// Ingen cache eller interception av nätverksanrop.

self.addEventListener("install", event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
});
