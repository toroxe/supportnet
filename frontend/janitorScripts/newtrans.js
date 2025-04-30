import { BASE_URL, ENDPOINTS } from "../myconfig.js";

let editingId = null;

// ==============================
// Funktion för att initiera transaktionsformuläret
// ==============================
function initializeTransactionForm() {
    const form = document.querySelector("[name='new-transaction-form']");

    if (!form) {
        console.error("Formuläret kunde inte hittas i DOM.");
        return;
    }

    const dateField = document.querySelector("[name='transaction-date']");
    if (dateField) {
        const today = new Date().toISOString().split("T")[0];
        dateField.value = today;
    }

    console.log("Formuläret har initialiserats.");
}

// ==============================
// Funktion för att ladda en befintlig transaktion för redigering
// ==============================
async function loadTransaction(id) {
    try {
        const res = await fetch(`${ENDPOINTS.ecoTransactions}/${id}`);
        if (!res.ok) throw new Error("Kunde inte hämta transaktion.");
        const data = await res.json();

        document.querySelector("[name='transaction-date']").value = data.transaction_date;
        document.querySelector("[name='transaction-description']").value = data.description || "";
        document.querySelector("[name='transaction-income']").value = data.income || 0;
        document.querySelector("[name='transaction-expense']").value = data.expense || 0;
        document.querySelector("[name='vat']").value = data.vat || 0;
        document.querySelector("[name='is-personal']").checked = !!data.is_personal;
        document.querySelector("[name='no-vat']").checked = !!data.no_vat;

        console.log("Formulär autofyllt för redigering.");
    } catch (error) {
        console.error("Fel vid laddning av transaktion:", error);
    }
}

// ==============================
// Funktion för att spara transaktion till backend
// ==============================
async function saveTransaction() {
    const form = document.querySelector("[name='new-transaction-form']");

    if (!form) {
        console.error("Formuläret kunde inte hittas i DOM.");
        return;
    }

    const transactionData = {
        transaction_date: form.querySelector("[name='transaction-date']")?.value || "",
        description: form.querySelector("[name='transaction-description']")?.value || "",
        income: parseFloat(form.querySelector("[name='transaction-income']")?.value) || 0,
        expense: parseFloat(form.querySelector("[name='transaction-expense']")?.value) || 0,
        vat: parseFloat(form.querySelector("[name='vat']")?.value) || 0,
        is_personal: form.querySelector("[name='is-personal']")?.checked ? 1 : 0,
        no_vat: form.querySelector("[name='no-vat']")?.checked ? 1 : 0,
    };

    try {
        const url = editingId ? ENDPOINTS.ecoUpdateTransaction(editingId) : ENDPOINTS.ecoAddTransaction;
        const method = editingId ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transactionData),
        });

        if (!response.ok) {
            throw new Error("Misslyckades med att spara transaktionen.");
        }

        const result = await response.json();
        console.log("Transaktion sparad:", result);
        alert("Transaktionen sparades framgångsrikt!");
        form.reset();
        closeFormAndNavigate();
    } catch (error) {
        console.error("Fel vid sparande av transaktion:", error);
        alert("Något gick fel vid sparande av transaktionen.");
    }
}

// ==============================
// Funktion för att stänga formuläret och navigera tillbaka
// ==============================
function closeFormAndNavigate() {
    console.log("Stänger formuläret och navigerar tillbaka till ekonomi.html");
    window.location.href = "ekonomi.html"; // Navigerar till ekonomi.html
}

// ==============================
// Funktion för att gömma formuläret
// ==============================
function hideForm() {
    console.log("Stänger formuläret...");
    window.location.href = "ekonomi.html"; // Navigerar till ekonomi.html
}

// ==============================
// Initiera när DOM är redo
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM är redo! Initierar newtrans.js...");
    initializeTransactionForm();

    // Kolla om vi redigerar
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get("id");
    if (idParam) {
        editingId = idParam;
        loadTransaction(editingId);
    }

    const saveButton = document.querySelector("[name='save-transaction-button']");
    if (saveButton) {
        saveButton.addEventListener("click", (event) => {
            event.preventDefault();
            saveTransaction();
        });
    } else {
        console.error("Spara-knappen kunde inte hittas i DOM.");
    }
});