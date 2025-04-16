const BASE_URL = "https://my.supportnet.se/api";

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

// ==============================
// Funktion för att hämta och rendera transaktioner
// ==============================
async function fetchTransactions() {
    console.log("Startar hämtning av transaktioner..."); // Kontrollpunkt 1
    try {
        const response = await fetch(`${BASE_URL}/eco/transactions`);
        console.log("Svar från backend:", response); // Kontrollpunkt 2
        if (!response.ok) {
            throw new Error("Misslyckades med att hämta transaktionerna.");
        }

        const transactions = await response.json();
        console.log("Hämtade transaktioner:", transactions); // Kontrollpunkt 3
        renderTransactions(transactions);
    } catch (error) {
        console.error("Fel vid hämtning av transaktioner:", error);
    }
}

async function fetchTransactions() {
    const loadingIndicator = document.getElementById("loadingIndicator");
    if (loadingIndicator) loadingIndicator.classList.remove("d-none"); // Visa indikator

    try {
        const response = await fetch(`${BASE_URL}/eco/transactions`);
        if (!response.ok) {
            throw new Error("Misslyckades med att hämta transaktionerna.");
        }

        const transactions = await response.json();
        renderTransactions(transactions);
    } catch (error) {
        console.error("Fel vid hämtning av transaktioner:", error);
    } finally {
        if (loadingIndicator) loadingIndicator.classList.add("d-none"); // Dölj indikator
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
        const response = await fetch(`${BASE_URL}/eco/add-transaction`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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

// ==========================================================================
// Funktionen uppdaterar värden i Moms och Skatt
// ==========================================================================

async function updateSummaryBoxes() {
    try {
        const response = await fetch(`${BASE_URL}/eco/balance`);
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

document.addEventListener("DOMContentLoaded", () => {
    updateSummaryBoxes(); // Körs när sidan laddas
});

// ==============================
// Initiera när DOM är redo
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM är redo!");

    if (document.querySelector(".transactions")) {
        console.log("Ekonomiöversiktssidan laddad. Hämta transaktioner...");
        fetchTransactions(); // Hämta och rendera transaktionerna
    }
    else{ console.log("Tabellkroppen hittades inte. Kontrollera HTML-strukturen.");}

    if (document.querySelector("[name='new-transaction-form']")) {
        console.log("Ny Transaktion-sidan laddad. Initiera formuläret...");
        initializeTransactionForm(); // Endast körs på newtrans.html
        const saveButton = document.querySelector("[name='save-transaction-button']");
        if (saveButton) {
            saveButton.addEventListener("click", (event) => {
                event.preventDefault();
                saveTransaction();
            });
        } else {
            console.error("Spara-knappen kunde inte hittas i DOM.");
        }
    }
});

// -------------------------------------------------------------------------------------------------------------------
// Dummmty script för testning
// -------------------------------------------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const transactionTable = document.getElementById("transactionTable");
    const filtersForm = document.getElementById("transactionFilters");
    const prevPage = document.getElementById("prevPage");
    const nextPage = document.getElementById("nextPage");

    // Dummy-data för transaktioner
    let transactions = [
        { date: "2025-01-10", type: "Intäkt", amount: "5,000 SEK", description: "Konsultarbete" },
        { date: "2025-01-09", type: "Utgift", amount: "2,000 SEK", description: "Kontorsmaterial" },
        { date: "2025-01-08", type: "Intäkt", amount: "10,000 SEK", description: "Projektarbete" },
        { date: "2025-01-07", type: "Utgift", amount: "1,500 SEK", description: "Resekostnader" }
    ];

    // Rendera transaktioner
    function renderTransactions(data) {
        transactionTable.innerHTML = data.map(t => `
            <tr>
                <td>${t.date}</td>
                <td>${t.type}</td>
                <td>${t.amount}</td>
                <td>${t.description}</td>
            </tr>
        `).join("");
    }

    // Filtrera och sortera
    filtersForm.addEventListener("input", () => {
        let filtered = [...transactions];
        const date = document.getElementById("filterDate").value;
        const type = document.getElementById("filterType").value;
        const sortBy = document.getElementById("sortBy").value;

        if (date) filtered = filtered.filter(t => t.date === date);
        if (type) filtered = filtered.filter(t => t.type === type);
        if (sortBy === "amount") filtered.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
        if (sortBy === "date") filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

        renderTransactions(filtered);
    });

    // Initiera första rendering
    renderTransactions(transactions);
});

// Sorteringslogik
let currentSort = { key: "", order: "asc" }; // Håller koll på sorteringen

document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
        const sortKey = th.getAttribute("data-sort");
        currentSort.order = currentSort.key === sortKey && currentSort.order === "asc" ? "desc" : "asc";
        currentSort.key = sortKey;

        // Uppdatera indikatorer
        document.querySelectorAll("th[data-sort]").forEach(header => {
            header.textContent = header.textContent.replace(" ▲", "").replace(" ▼", "");
        });
        th.textContent += currentSort.order === "asc" ? " ▲" : " ▼";

        // Sortera transaktionerna
        let sortedTransactions = [...transactions].sort((a, b) => {
            const aValue = sortKey === "amount" ? parseFloat(a.amount.replace(/\D/g, "")) : a[sortKey];
            const bValue = sortKey === "amount" ? parseFloat(b.amount.replace(/\D/g, "")) : b[sortKey];

            if (sortKey === "date") {
                return currentSort.order === "asc"
                    ? new Date(aValue) - new Date(bValue)
                    : new Date(bValue) - new Date(aValue);
            } else if (typeof aValue === "string") {
                return currentSort.order === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else {
                return currentSort.order === "asc" ? aValue - bValue : bValue - aValue;
            }
        });

        renderTransactions(sortedTransactions);
    });
});



