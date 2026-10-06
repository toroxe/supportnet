// MySupportNet PWA
// Version: 2026.10.06-01

let deferredPrompt = null;

const installButton = document.getElementById("installPWA");

if (installButton) {
    installButton.style.display = "none";
}

async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
        const registration = await navigator.serviceWorker.register(
            "/user/sw.js",
            {
                scope: "/user/",
                updateViaCache: "none"
            }
        );

        console.log(
            "✅ MSN service worker registrerad:",
            registration.scope
        );
    } catch (error) {
        console.error(
            "❌ MSN service worker kunde inte registreras:",
            error
        );
    }
}

if (document.readyState === "complete") {
    registerServiceWorker();
} else {
    window.addEventListener("load", registerServiceWorker, { once: true });
}

window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;

    if (installButton) {
        installButton.style.display = "inline-block";
    }
});

if (installButton) {
    installButton.addEventListener("click", async () => {
        if (!deferredPrompt) return;

        const promptEvent = deferredPrompt;
        deferredPrompt = null;
        installButton.style.display = "none";

        try {
            await promptEvent.prompt();
            await promptEvent.userChoice;
        } catch (error) {
            console.error("❌ Appinstallationen kunde inte startas:", error);
        }
    });
}

window.addEventListener("appinstalled", () => {
    deferredPrompt = null;

    if (installButton) {
        installButton.style.display = "none";
    }

    console.log("✅ MySupportNet installerad som app");
});
