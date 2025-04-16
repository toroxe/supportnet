// ============================
// 🧱 Global endpoint – använder BASE_URL från contract.js
// ============================

import { BASE_URL } from "./contract.js?v=1.3.3";
const industryEndpoint = "https://my.supportnet.se/api/industries"; // TEMP FIX
console.log("Min Nya fina anropare:", industryEndpoint);
console.log("🧪 BASE_URL från import:", BASE_URL);

// ============================
// 🚪 Öppnar modal och nollställer formuläret
// ============================
function openIndustryModal() {
    resetIndustryForm();
    const modal = new bootstrap.Modal(document.querySelector("#industryModal"));
    modal.show();
}
window.openIndustryModal = openIndustryModal;

// ============================
// 🧹 Tömmer fälten i formuläret
// ============================
function resetIndustryForm() {
    document.querySelector("#industry-id-hidden").value = "";
    document.querySelector("#new-industry-name").value = "";
    document.querySelector("#new-industry-note").value = "";
    document.querySelector("#new-industry-active").checked = true;
}

// ============================
// 🧲 Hämtar branscher från API och skickar till render
// ============================
async function loadIndustries() {
    try {
        const res = await fetch(industryEndpoint);
        const industries = await res.json();
        renderIndustryList(industries);
    } catch (err) {
        console.error("Fel vid hämtning av branscher:", err);
    }
}

// ============================
// 🧾 Renderar branscher i vänsterspalten
// ============================
function renderIndustryList(industries) {
    const list = document.getElementById("industry-list");
    list.innerHTML = "";

    industries.forEach(ind => {
        const item = document.createElement("div");
        item.className = "list-group-item d-flex justify-content-between align-items-center";
        item.innerHTML = `
            <span>${ind.name}</span>
            <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="editIndustry(${ind.ind_id})">Redigera</button>
        `;
        list.appendChild(item);
    });
}

// ============================
// ✏️ Fyller formuläret med data vid redigering
// ============================
async function editIndustry(id) {
    try {
        const res = await fetch(industryEndpoint);
        const industries = await res.json();
        const match = industries.find(i => i.ind_id === id);
        if (!match) return;

        document.querySelector("#industry-id-hidden").value = match.ind_id;
        document.querySelector("#new-industry-name").value = match.name;
        document.querySelector("#new-industry-note").value = match.note || "";
        document.querySelector("#new-industry-active").checked = match.active;

        const modal = new bootstrap.Modal(document.querySelector("#industryModal"));
        modal.show();
    } catch (err) {
        console.error("Kunde inte hämta bransch för redigering:", err);
    }
}

// ============================
// 💾 Skickar in (POST/PUT) ny eller uppdaterad bransch
// ============================
async function submitIndustryForm(event) {
    event.preventDefault();

    const id = document.querySelector("#industry-id-hidden").value;
    const payload = {
        name: document.querySelector("#new-industry-name").value,
        note: document.querySelector("#new-industry-note").value,
        active: document.querySelector("#new-industry-active").checked
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${industryEndpoint}/${id}` : industryEndpoint;

    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await loadIndustries();
            resetIndustryForm();

            // 🧼 Stäng modalen
            const modalEl = document.querySelector("#industryModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            alert("Maria viskar: Branschen är nu tryggt sparad i databasen. 💚");
        } else {
            alert("Hoppsan! Kunde inte spara branschen. Försök igen.");
        }
    } catch (err) {
        console.error("Fel vid POST/PUT av bransch:", err);
    }
}

// ============================
// 🚀 Initierar händelser vid sidladdning
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector("#openIndustryModalBtn");
    if (btn) {
        btn.addEventListener("click", openIndustryModal);
    }

    loadIndustries();
});