import { BASE_URL, ENDPOINTS } from "../myconfig.js";

let currentPage = 1;
const itemsPerPage = 12;

// ==============================
// Funktion för att spara moms och skatt
// ==============================
async function saveVatAdjustment(event) {
    event.preventDefault();

    const form = document.querySelector("#vat-update-form");
    if (!form) {
        console.error("Formuläret kunde inte hittas i DOM.");
        return;
    }

    const vatData = {
        transaction_date: document.querySelector("#adjustment-date")?.value || new Date().toISOString().split("T")[0],
        vat_settlement: parseFloat(document.querySelector("#vat-settlement")?.value) || 0,
        tax_reservation: parseFloat(document.querySelector("#tax-reservation")?.value) || 0,
    };

    console.log("Data som skickas till backend:", vatData);

    try {
        const response = await fetch(ENDPOINTS.ecoVatSummary, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(vatData),
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            console.error("Serverfel:", errorDetails);
            throw new Error("Misslyckades med att spara moms och skatt.");
        }

        const result = await response.json();
        console.log("Moms och skatt sparad:", result);

        alert("Moms och skatt sparades framgångsrikt!");
        window.location.href = "ekonomi.html";
    } catch (error) {
        console.error("Fel vid sparande av moms och skatt:", error);
        alert("Något gick fel vid sparandet.");
    }
}

// ==============================
// Funktion för att hämta tidigare transaktioner
// ==============================
async function fetchVatTransactions(page) {
    try {
        console.log(`Hämtar transaktioner för sida ${page}...`);
        const response = await fetch(ENDPOINTS.ecoVatTransactions(page, itemsPerPage));
        if (!response.ok) {
            throw new Error("Misslyckades med att hämta tidigare avstämningar.");
        }

        const { transactions, totalPages } = await response.json();
        console.log("Hämtade transaktioner:", transactions);
        renderVatTransactions(transactions, totalPages);
    } catch (error) {
        console.error("Fel vid hämtning av tidigare avstämningar:", error);
    }
}

// ==============================
// Renderar transaktioner i tabellen
// ==============================
function renderVatTransactions(transactions, totalPages) {
    const tableBody = document.querySelector("#vat-transactions");
    tableBody.innerHTML = "";

    if (transactions.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='3'>Inga tidigare avstämningar hittades.</td></tr>";
        return;
    }

    transactions.forEach((transaction) => {
        const row = `
            <tr>
                <td>${transaction.transaction_date}</td>
                <td>${transaction.vat} SEK</td>
                <td>${transaction.reserved_tax} SEK</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML("beforeend", row);
    });

    document.querySelector("#current-page").textContent = currentPage;
    document.querySelector("#prev-page").disabled = currentPage === 1;
    document.querySelector("#next-page").disabled = currentPage === totalPages;
}

// ==============================
// Hantering av sid-navigering
// ==============================
document.querySelector("#prev-page").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        fetchVatTransactions(currentPage);
    }
});

document.querySelector("#next-page").addEventListener("click", () => {
    currentPage++;
    fetchVatTransactions(currentPage);
});

// =======================================
// Renderar dagens datum
// =======================================
function renderCurrentDate() {
    const dateInput = document.querySelector("#adjustment-date");
    if (!dateInput) {
        console.error("Datumfält kunde inte hittas i DOM.");
        return;
    }

    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
    console.log(`Datum renderat: ${today}`);
}

// ==============================
// Initiera sidan
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM är redo för moms och skatt-uppdatering.");

    const saveButton = document.querySelector("#vat-update-form button[type='submit']");
    if (saveButton) {
        saveButton.addEventListener("click", saveVatAdjustment);
        console.log("Event-lyssnare för sparknappen har lagts till.");
    } else {
        console.error("Spara-knappen kunde inte hittas i DOM.");
    }

    renderCurrentDate();
    fetchVatTransactions(currentPage); // Starta med första sidan
}); 