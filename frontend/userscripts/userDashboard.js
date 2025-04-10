// ------------------------------------------------------------
// 🌟 DETTA ÄR STANDARD - START FÖR VARJE USERXXX.js
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Initierar dashboard...");
    
    const ok = await initUserSession();
    if (!ok) return;

    const contract_id = sessionStorage.getItem("contract_id");
    console.log("Test konsoll",contract_id); 

    // 🩹 Se till att contract_id sätts korrekt om det saknas
    const userDataRaw = sessionStorage.getItem("userData");
    if (!sessionStorage.getItem("contract_id") && userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        if (userData.contract) {
            sessionStorage.setItem("contract_id", userData.contract);
            console.log("📌 contract_id satt från userData:", userData.contract);
        } else {
            console.warn("⚠️ userData.contract saknas!");
        }
    }

    // Nu är sessionen säker – bygg sidan
    try {
        const token = sessionStorage.getItem("authToken");
        const dashboardData = await fetchDashboardData(token);
        console.log("Min data nu och här",dashboardData);
        if (!dashboardData?.data) return;

        const services = dashboardData.data.services;
        renderServices(services);
    } catch (error) {
        console.error("❌ Fel vid hämtning av dashboard-data:", error);
    }
});

// ------------------------------------------------------------
// 🔁 Hämta dashboard-data från backend
// ------------------------------------------------------------
async function fetchDashboardData(token) {
    try {
        const response = await fetch(`${BASE_URL}/dashboard`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        let result;

        try {
            result = await response.json();
        } catch (jsonError) {
            const text = await response.text();  // läs EN gång!
            console.error("❌ Kunde inte parsa JSON. Server-svar:", text);
            return null;
        }

        console.log("🎯 Fick dashboard-data:", result);

        if (result.status === "OK") {
            return result;
        } else {
            console.warn("⚠️ Dashboard-status:", result.message);
            return null;
        }

    } catch (err) {
        console.error("❌ Fel vid hämtning av dashboard:", err);
        return null;
    }
}

// ------------------------------------------------------------
// 🧱 Rendera tjänster
// ------------------------------------------------------------
function renderServices(services) {
    const container = document.querySelector("#serviceContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!services || services.length === 0) {
        container.innerHTML = `<p class="text-center">Inga aktiva tjänster tillgängliga.</p>`;
        return;
    }

    const serviceLinks = {
        "Member": "/userpages/member.html",
        "User Documents": "/userpages/documents.html",
        "To-Do List": "/userpages/todo.html",
        "Post-It Notes": "/userpages/postit.html",
        "Inbound Management": "/userpages/inbound.html",
        "Survey Access": "/userpages/usecase.html"
    };

    const userId = sessionStorage.getItem("user_id");
    const contractId = sessionStorage.getItem("contract_id");
    const username = sessionStorage.getItem("user") || "Vän";

    services.forEach(service => {
        const button = document.createElement("button");
        button.classList.add("btn", "btn-primary", "btn-lg", "m-2", "w-100");
        button.textContent = service;

        if (serviceLinks[service]) {
            button.onclick = () => {
                sessionStorage.setItem("user_id", userId);
                sessionStorage.setItem("contract_id", contractId);
                sessionStorage.setItem("username", username);
                window.location.href = serviceLinks[service];
            };
        } else {
            button.onclick = () => alert(`❌ Ingen sida kopplad till ${service}`);
        }

        container.appendChild(button);
    });
}


