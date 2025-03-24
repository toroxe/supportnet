const BASE_URL = "https://my.supportnet.se/";

// ----------------------------------------------------------------
// 🚀 När sidan laddas – Initiera sessionhantering och dashboard
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 DOMContentLoaded - Laddar användardata och session...");

    // 🟢 Kontrollera enhetstyp från sessionStorage
    if (!sessionStorage.getItem("deviceType")) {
        let isMobileDevice = /(Mobi|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Opera Mini|IEMobile)/i.test(navigator.userAgent);
        sessionStorage.setItem("deviceType", isMobileDevice ? "mobile" : "pc");
        console.log("🔥 Enhetstyp satt direkt i dashboard:", sessionStorage.getItem("deviceType"));
    } else {
        console.log("📱 Enhetstyp hämtad från sessionStorage:", sessionStorage.getItem("deviceType"));
    }    

    // 🟢 Hämta token och användardata från sessionStorage
    let token = sessionStorage.getItem("authToken");
    let userData = sessionStorage.getItem("userData");
    let contractId = sessionStorage.getItem("contract_id");

    console.log("🔑 Token:", token ? token : "❌ INGEN TOKEN FUNNEN!");

    if (userData) {
        userData = JSON.parse(userData);
        console.log("✅ Användardata:", userData);

        // 🟢 Återställ contract_id om det saknas
        if (!contractId && userData.contract) {
            sessionStorage.setItem("contract_id", userData.contract);
            contractId = userData.contract;
            console.log("🔄 Återställde contract_id i sessionStorage:", contractId);
        }
    } else {
        console.warn("⚠️ Ingen användardata hittades i sessionStorage.");
    }

    console.log("✅ Contract ID:", contractId ? contractId : "❌ INGEN contract_id FUNNEN!");

    // 🟢 Ladda header och uppdatera användarnamnet
    try {
        const response = await fetch("../userpages/userHeader.html");
        const headerHTML = await response.text();
        document.getElementById("header-placeholder").innerHTML = headerHTML;

        if (userData && userData.c_name) {
            document.getElementById("dashboardUser").textContent = `Välkommen, ${userData.c_name}!`;
        }

        // 🟢 Lägg till utloggningsfunktion med bekräftelse
        document.getElementById("logoutButton").addEventListener("click", function () {
            if (confirm("Är du säker på att du vill logga ut?")) {
                console.log("👋 Användaren loggar ut...");
                sessionStorage.clear();
                window.location.href = "../auth/userLogin.html"; // Skickar användaren till login
            }
        });
    } catch (error) {
        console.error("❌ Kunde inte ladda header:", error);
    }

    // 🟢 Hämta dashboard-data
    try {
        const dashboardData = await fetchDashboardData(token);
        // 🟢 Spara contract_id från API-responsen om det saknas
        if (!sessionStorage.getItem("contract_id") && dashboardData?.data?.contract?.id) {
            sessionStorage.setItem("contract_id", dashboardData.data.contract.id);
            console.log("📌 contract_id hämtat från API och sparat:", dashboardData.data.contract.id);
        }

        console.log("✅ Hämtad dashboard-data:", dashboardData);

        if (dashboardData && dashboardData.data) {
            renderServices(dashboardData.data.services);
        }
    } catch (error) {
        console.error("❌ Fel vid hämtning av dashboard-data:", error);
    }

    console.log("✅ Alla funktioner är nu aktiva.");
});

// ----------------------------------------------------------------
// 🔍 API-anrop för att hämta dashboard-data
// ----------------------------------------------------------------
async function fetchDashboardData(token) {
    try {
        const headers = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = "Bearer " + token;
        }

        const response = await fetch(`${BASE_URL}userapi/dashboard`, { method: "GET", headers });

        if (!response.ok) {
            throw new Error(`Misslyckades att hämta dashboard-data: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("❌ Fel vid API-anrop:", error);
        return null;
    }
}

// ----------------------------------------------------------------
// 🎯 Rendera tjänst-knappar dynamiskt i dashboarden
// ----------------------------------------------------------------
function renderServices(services) {
    const container = document.querySelector("#serviceContainer");
    if (!container) {
        console.error("❌ Hittade inte #serviceContainer i DOM.");
        return;
    }

    container.innerHTML = ""; // Rensa tidigare innehåll

    if (!services || services.length === 0) {
        container.innerHTML = `<p class="text-center">Inga aktiva tjänster tillgängliga.</p>`;
        return;
    }

    // Definiera länkar för varje tjänst
    const serviceLinks = {
        "Member": "/userpages/member.html",
        "User Documents": "/userpages/documents.html",
        "To-Do List": "/userpages/todo.html",
        "Post-It Notes": "/userpages/postit.html", 
        "Inbound Management": "/userpages/inbound.html"
    };

    services.forEach(service => {
        const button = document.createElement("button");
        button.classList.add("btn", "btn-primary", "btn-lg", "m-2", "w-100");
        button.textContent = service;

        if (serviceLinks[service]) {
            button.onclick = () => window.location.href = serviceLinks[service];
        } else {
            button.onclick = () => alert(`Ingen sida kopplad till ${service}`);
        }

        container.appendChild(button);
    });
}

// ----------------------------------------------------------------
// 🔄 Live-övervakning av sessionStorage (felsökning)
// ----------------------------------------------------------------


// ----------------------------------------------------------------
// 🟢 Hantera PWA-installation
// ----------------------------------------------------------------
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.querySelector("#installPWA").style.display = "block"; 
});

document.getElementById("installPWA").addEventListener("click", () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
                console.log("✅ App installerad!");
            }
            deferredPrompt = null;
        });
    }
});

// ----------------------------------------------------------------
// 🟢 Service Worker – Registrerar PWA-tjänsten
// ----------------------------------------------------------------
/*if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/assets/pwa/service-worker.js")
        .then(() => console.log("✅ Service Worker registrerad!"))
        .catch(err => console.error("❌ Service Worker error:", err));
}*/

// ----------------------------------------------------------------
// 🏁 Klart! Dashboard initieras och all funktionalitet är på plats!
// ----------------------------------------------------------------


