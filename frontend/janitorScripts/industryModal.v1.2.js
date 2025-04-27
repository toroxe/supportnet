import { ENDPOINTS } from "../myconfig.js";
let currentIndustryId = null;

console.log("📡 Använder ENDPOINT:", ENDPOINTS.industries);

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
        const res = await fetch(ENDPOINTS.industries);
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
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="editIndustry(${ind.ind_id})">Redigera</button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteIndustry(${ind.ind_id})">Radera</button>
            </div>
        `;

        list.appendChild(item);
    });
}

// ============================
// ✏️ Fyller formuläret med data vid redigering
// ============================
async function editIndustry(id) {
    try {
        const res = await fetch(ENDPOINTS.industries);
        const industries = await res.json();

        const industry = industries.find(i => i.ind_id === id);
        if (!industry) {
            console.error("❌ Hittade ingen bransch med ID:", id);
            return;
        }

        currentIndustryId = industry.ind_id;

        document.querySelector("#industry-id-hidden").value = industry.ind_id;
        document.querySelector("#new-industry-name").value = industry.name;
        document.querySelector("#new-industry-note").value = industry.note || "";
        document.querySelector("#new-industry-active").checked = industry.active;

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

    const id = currentIndustryId;
    const name = document.querySelector("#new-industry-name").value.trim();
    const note = document.querySelector("#new-industry-note").value.trim();
    const active = document.querySelector("#new-industry-active").checked;

    const payload = {
        name,
        note,
        active
    };

    const method = id ? "PUT" : "POST";
    const url = id
        ? `${ENDPOINTS.industries}${id}`
        : ENDPOINTS.industries;

    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Felstatus: ${res.status}`);

        // 🧹 Rensa formulär och nollställ ID
        document.querySelector("#industryForm").reset();
        currentIndustryId = null;

        // 🔄 Uppdatera listan
        await loadIndustries();

        // ✅ Stäng modalen (fungerar oavsett Bootstrap setup)
        const modalEl = document.getElementById("industryModal");
        if (window.bootstrap && bootstrap.Modal.getInstance) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        } else {
            $("#industryModal").modal("hide");
        }

    } catch (err) {
        console.error("Fel vid POST/PUT av bransch:", err);
    }
}

//---------------------------------------------------
// Raderar bransch DELETE
//---------------------------------------------------

async function deleteIndustry(ind_id) {
    if (!confirm("Är du säker på att du vill radera denna bransch?")) return;

    try {
        const res = await fetch(`${ENDPOINTS.industries}${ind_id}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Radering misslyckades");

        alert("✅ Bransch raderad!");
        await loadIndustries();
    } catch (err) {
        console.error("❌ Fel vid radering av bransch:", err);
        alert("🚨 Kunde inte radera branschen.");
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

    const industryForm = document.querySelector("#industryForm");
    if (industryForm) {
        industryForm.addEventListener("submit", submitIndustryForm);
    }

    if (window.location.pathname.includes("contract.html")) {
        loadIndustries();
    }    
    
});

export async function fillIndustryDropdown(selectedId = null) {
    try {
        const res = await fetch(ENDPOINTS.industries);
        const industries = await res.json();

        const dropdown = document.querySelector("#industry_id");
        if (!dropdown) return;

        dropdown.innerHTML = `<option value="">Välj bransch...</option>`;

        industries.forEach(ind => {
            const option = document.createElement("option");
            option.value = ind.ind_id;
            option.textContent = ind.name;
            if (selectedId && ind.ind_id === selectedId) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        });
    } catch (err) {
        console.error("❌ Kunde inte ladda branschlista:", err);
    }
}

window.editIndustry = editIndustry;
window.deleteIndustry = deleteIndustry;

