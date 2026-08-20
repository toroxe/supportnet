const CACHE_NAME = "supportnet-v1";
const STATIC_ASSETS = [
    "/auth/userLogin.html",  // 🔹 Lägg till inloggningssidan
    "/assets/css/styles.css",
    "/userscripts/userDashboard.js",
    "/assets/pics/loggan.png",
    "/assets/pwa/manifest.json"
];

// 🔹 Installera service worker och cache statiska filer
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// 🔹 Hantera fetch – uteslut index.html från cache
self.addEventListener("fetch", (event) => {
    if (event.request.url.includes("userLogin.html")) {
        return fetch(event.request); // Alltid hämta senaste versionen
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});

// 🔹 Uppdatera cache vid nya versioner
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
});

