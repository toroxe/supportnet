import { ENDPOINTS } from "../myconfig.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("📊 Janitor dashboard laddad!");
    renderUserStats();
});

async function renderUserStats() {
    const container = document.createElement("div");
    container.className = "container mt-4";
    container.id = "dashboard-stats";
    document.querySelector("main").appendChild(container);

    try {
        const response = await fetch(ENDPOINTS.allUsers);
        const users = await response.json();

        const statusLabels = {
            "ACTIVE": "Aktiv",
            "INACTIVE": "Inaktiv",
            "PROSPECT": "Prospect"
        };

        const total = users.length;
        const active = users.filter(u => u.status === "ACTIVE").length;
        const inactive = users.filter(u => u.status === "INACTIVE").length;
        const prospects = users.filter(u => u.status === "PROSPECT").length;

        container.innerHTML = `
            <div class="row text-center">
                <div class="col-md-3">
                    <div class="card p-3 shadow-sm">
                        <h6 class="text-muted">Totalt antal användare</h6>
                        <h2>${total}</h2>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card p-3 shadow-sm border-success">
                        <h6 class="text-success">${statusLabels["ACTIVE"]}a användare</h6>
                        <h2>${active}</h2>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card p-3 shadow-sm border-warning">
                        <h6 class="text-warning">${statusLabels["PROSPECT"]}-användare</h6>
                        <h2>${prospects}</h2>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card p-3 shadow-sm border-secondary">
                        <h6 class="text-secondary">${statusLabels["INACTIVE"]}a användare</h6>
                        <h2>${inactive}</h2>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("❌ Fel vid hämtning av användare:", error);
        container.innerHTML = `<div class="alert alert-danger">Kunde inte ladda användardata</div>`;
    }
}