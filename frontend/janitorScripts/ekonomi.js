import { BASE_URL, ENDPOINTS } from "../myconfig.js";
let transactions = [];

console.log("ekonomi.js laddad!");

// ==============================
// Funktion för att initiera transaktionsformuläret
// ==============================
function initializeTransactionForm() {
    const form = document.querySelector("[name='new-transaction-form']");

    if (!form) {
        console.error("Formuläret kunde inte hittas i DOM.");
        return;
    }

    // Förifyll datumfältet med dagens datum
    const dateField = document.querySelector("[name='transaction-date']");
    if (dateField) {
        const today = new Date().toISOString().split("T")[0];
        dateField.value = today;
    }

    console.log("Formuläret har initialiserats.");
}

//==================================
// Funktion för att Hämta användaren
//==================================

let usersById = {};

async function fetchUsers() {
    try {
        const res = await fetch(ENDPOINTS.allUsers);
        const users = await res.json();
        usersById = {};
        users.forEach(user => {
            usersById[user.id] = user.full_name.split(" ")[0]; // Bara förnamn
        });
        console.log("🧑‍💼 Användare laddade:", usersById);
    } catch (err) {
        console.error("Kunde inte hämta användare:", err);
    }
}

// ==============================
// Funktion för att hämta 
// ==============================

async function fetchTransactions() {
    console.log("🔄 Startar hämtning av transaktioner...");

    try {
        await fetchUsers(); // 🟡 Hämta användare först

        const response = await fetch(ENDPOINTS.ecoTransactions);
        if (!response.ok) throw new Error(`❌ Backendfel: ${response.status}`);

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) console.warn("⚠️ Tom lista");

        transactions = data;
        renderTransactions(transactions);

    } catch (error) {
        console.error("🚨 Fel vid hämtning av transaktioner:", error);
        alert("Kunde inte hämta transaktioner från servern.");
    }
}

//===================================
// Funktion för att rendera
//===================================

function renderTransactions(data) {
    const tableBody = document.querySelector("tbody.transactions");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    data.forEach((t) => {
        if (!t.transaction_date && !t.income && !t.expense && !t.note && !t.description) return;

        const isIncome = t.income > 0;
        const isExpense = t.expense > 0;
        const ansvarig = usersById[t.user_id] || "-";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${t.transaction_date || "-"}</td>
            <td class="text-end ${isIncome ? 'text-success fw-bold' : ''}">${t.income ? `${t.income} SEK` : "-"}</td>
            <td class="text-end ${isExpense ? 'text-danger fw-bold' : ''}">${t.expense ? `${t.expense} SEK` : "-"}</td>
            <td>${t.note || "-"}</td>
            <td>${t.description || "-"}</td>
            <td>${ansvarig}</td>
            <td>
                <a href="newtrans.html?id=${t.id}" class="btn btn-sm btn-warning">Redigera</a>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
}

// ==============================
// Renderar inne hållet i transaktions modalen 
// ==============================
function renderTransactionModal() {
    const tableBody = document.querySelector("#transactionTable");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    transactions.forEach(t => {
        const type = t.income > 0 ? "Intäkt" : t.expense > 0 ? "Utgift" : "-";
        const amount = t.income > 0 ? t.income : t.expense > 0 ? t.expense : "-";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${t.transaction_date || "-"}</td>
            <td>${type}</td>
            <td class="text-end">${amount !== "-" ? `${amount} SEK` : "-"}</td>
            <td>${t.description || "-"}</td>
        `;
        tableBody.appendChild(row);
    });
}

// ==========================================================================
// Funktionen uppdaterar värden i Moms och Skatt
// ==========================================================================

async function updateSummaryBoxes() {
    try {
        const response = await fetch(ENDPOINTS.ecoBalance);
        if (!response.ok) {
            throw new Error("Misslyckades med att hämta uppdaterad balans.");
        }

        const data = await response.json();
        document.querySelector("#vat-settled").textContent = `${data.vat_settlement} SEK`;
        document.querySelector("#tax-reserved").textContent = `${data.tax_reservation} SEK`;
    } catch (error) {
        console.error("Fel vid uppdatering av summeringsboxar:", error);
    }
}

// ==============================
// Initiera när DOM är redo
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.querySelector("#open-settings");
    const saveBtn = document.querySelector("#save-settings-btn");
    const modalEl = document.querySelector("#settingsModal");

    const balanceInput = document.querySelector("#limit-balance");
    const taxInput = document.querySelector("#limit-tax");
    const vatInput = document.querySelector("#limit-vat");

// Renderar transaktioner
    console.log("🟢 DOM redo – anropar fetchTransactions()");
    fetchTransactions();


// 🟡 Öppna modal och hämta inställningar
openBtn?.addEventListener("click", async () => {
    try {
        const res = await fetch(ENDPOINTS.ecoSettingsGet);
    if (!res.ok) throw new Error("Kunde inte hämta inställningar.");
    const data = await res.json();

    balanceInput.value = data.limit_balance;
    taxInput.value = data.limit_tax;
    vatInput.value = data.limit_vat;
    } catch (err) {
    console.error("Fel vid GET:", err);
    alert("Kunde inte hämta inställningarna.");
    }
});

// 🔵 Spara ändringar och stäng
saveBtn?.addEventListener("click", async () => {
    const updated = {
        contract_id: 1,
        limit_balance: parseFloat(balanceInput.value) || 0,
        limit_tax: parseFloat(taxInput.value) || 0,
        limit_vat: parseFloat(vatInput.value) || 0
    };
    ;

    try {
        const res = await fetch(ENDPOINTS.ecoSettingsUpdate, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
    });

    if (!res.ok) throw new Error("Kunde inte spara inställningar.");

    const instance = bootstrap.Modal.getInstance(modalEl);
    instance?.hide();
    alert("Inställningarna har sparats.");
    } catch (err) {
    console.error("Fel vid PUT:", err);
    alert("Det gick inte att spara inställningarna.");
    }
});
});

const transactionModalEl = document.querySelector("#transactionModal");

transactionModalEl?.addEventListener("show.bs.modal", () => {
    console.log("🔵 Modal för transaktioner öppnas – laddar data...");
    renderTransactionModal();
});


//=============================================================================================
//========================= Logik för inställningar ===========================================
//=============================================================================================

//-----------------------------------------------------------
// Laddar inställningar när modalen öppnas
//------------------------------------------------------------

