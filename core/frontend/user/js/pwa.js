let deferredPrompt = null;

const installButton = document.getElementById("installPWA");

if (installButton) {
    installButton.style.display = "none";
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            await navigator.serviceWorker.register("/user/sw.js");
            console.log("✅ PWA service worker registrerad");
        } catch (error) {
            console.error("❌ Service worker kunde inte registreras:", error);
        }
    });
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

        deferredPrompt.prompt();
        await deferredPrompt.userChoice;

        deferredPrompt = null;
        installButton.style.display = "none";
    });
}

window.addEventListener("appinstalled", () => {
    deferredPrompt = null;

    if (installButton) {
        installButton.style.display = "none";
    }

    console.log("✅ MySupportNet installerad som app");
});
