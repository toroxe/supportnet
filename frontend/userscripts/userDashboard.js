// ------------------------------------------------------------
// 🌟 Dashboard – klient till drottningen
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Initierar dashboard...");

    const ok = await initUserSession();
    if (!ok) return;

    try {
        const token = sessionStorage.getItem("authToken");
        const dashboardData = await fetchDashboardData(token);
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
    if (!token) return null;

    const response = await fetch(`${BASE_URL}dashboard`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) return null;
    return await response.json();
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


