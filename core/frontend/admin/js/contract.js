//---------------------------------------------------------------
// Min BASE Global
//---------------------------------------------------------------
import { BASE_URL, ENDPOINTS } from "/js/myconfig.js";
import * as IndustryModule from "/admin/js/industryModal.v1.2.js";

console.log("🧪 Kontroll ENDPOINT:", ENDPOINTS?.industries);

let contractIdGlobal = null;  // 🔥 Global variabel för ID
let contractNameGlobal = null;
let loadedUsers = []; // 🔥 Global variabel för att spara hämtade användare
let currentUserId = null; // 🔁 Global variabel så vi vet vilken användare vi jobbar med

//------------------------------------------
// Min contentloader
// ----------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 DOMContentLoaded - Laddar kritiska funktioner...");

    // 🔍 Hämta URL-parametrar
    const urlParams = new URLSearchParams(window.location.search);
    contractIdGlobal = urlParams.get("id");
    contractNameGlobal = null; // Återställ innan vi laddar

    // 🧠 Fånga och validera contractIdGlobal från URL
    const rawId = urlParams.get("id");
    contractIdGlobal = rawId && rawId !== "undefined" ? rawId : null;

if (contractIdGlobal) {
    console.log("✅ Hittade giltigt contractIdGlobal i URL:", contractIdGlobal);

    // 🔥 Hämta kontraktsdata och sätt contractNameGlobal
    try {
        const response = await fetch(ENDPOINTS.contracts);
        if (!response.ok) throw new Error("Servern svarade inte OK");

        const contract = await response.json();
        contractNameGlobal = contract.company_name;
        console.log("✅ Satt contractNameGlobal:", contractNameGlobal);
    } catch (error) {
        console.error("❌ Fel vid hämtning av kontrakt för namn:", error);
    }

    // 🧲 Ladda kontraktsdata till formuläret
    try {
        console.log("📌 Kontrakt-ID identifierat:", contractIdGlobal);
        await loadContract();
    } catch (err) {
        console.error("❌ Fel vid loadContract:", err);
    }

} else {
    console.warn("⚠️ Inget giltigt contractIdGlobal hittat, skapar nytt kontrakt vid behov.");
    await fillIndustryDropdown(); // Fyll dropdown även vid nytt kontrakt
}

    // 🔥 Rendera användare DIREKT om contractNameGlobal finns
    if (contractNameGlobal) {
        console.log("📌 Hämtar och renderar användare...");
        await fetchAndRenderUsers();
    } else {
        console.warn("⚠️ Ingen contractNameGlobal, kan inte hämta användare!");
    }

    // 🔥 Ladda kontraktstabellen om vi är på mycontracts.html
    if (window.location.pathname.includes("mycontracts.html")) {
        console.log("📜 Laddar kontraktslista...");
        await fetchAndRenderContracts();
    }

    // 🔥 Koppla event listeners (endast en gång!)
    document.addEventListener("click", async function (event) {
        const target = event.target;

        if (target.id === "saveContract") {
            await saveContract();
        }

        if (target.classList.contains("deleteContract")) {
            const contractId = target.getAttribute("data-id");
            console.log(`🗑️ Tar bort kontrakt ID: ${contractId}`);
            await deleteContract(contractId);
        }

        if (target.id === "saveUserChanges") {
            const userId = target.getAttribute("data-id");
            console.log(`👤 Sparar ändringar för användare: ${userId}`);
            await saveUserChanges(userId);
        }
    });

    const saveUserBtn = document.querySelector("#saveUserChanges");
if (saveUserBtn) {
    saveUserBtn.addEventListener("click", saveUserChanges);
}
    console.log("✅ Alla funktioner är nu aktiva.");
});

// -------------------------------------------------------------------------
// Hämtar och renderar alla kontrakt i tabellen på mycontracts.html
// -------------------------------------------------------------------------
async function fetchAndRenderContracts() {
    try {
        const response = await fetch(ENDPOINTS.contracts);
        if (!response.ok) throw new Error("Misslyckades att hämta kontrakt");

        const contracts = await response.json();
        renderContracts(contracts);
    } catch (error) {
        console.error("❌ Fel vid hämtning av kontrakt:", error);
    }
}

// --------------------------------------------------------------------------
// Renderar kontrakten i tabellen
// --------------------------------------------------------------------------
function renderContracts(contracts) {
    const tableBody = document.querySelector("#contractsTable");

    if (!tableBody) {
        console.error("⚠️ Fel: #contractsTable hittades inte i DOM!");
        return;
    }

    tableBody.innerHTML = ""; // Rensa tabellen innan ny rendering

    contracts.forEach(contract => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${contract.contract_id || "-"}</td>
            <td>${contract.company_name || "-"}</td>
            <td>${contract.industry_name || "Ej klassad"}</td>
            <td>${formatStatus(contract.status)}</td>
            <td>${contract.ref_person || "-"}</td>
            <td>${contract.registration_date ? new Date(contract.registration_date).toISOString().split("T")[0] : "-"}</td>
            <td>${contract.credit_assessed ? "Ja" : "Nej"}</td>
            <td>${contract.email || "-"}</td>
            <td>${contract.phone || "-"}</td>
            <td>
                <button class="btn btn-primary btn-sm editContract" data-id="${contract.contract_id}">Redigera</button>
                <button class="btn btn-danger btn-sm deleteContract" data-id="${contract.contract_id}">Radera</button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    attachEditListeners(); // Koppla knappar
}

function formatStatus(status) {
    switch (status) {
        case "ACTIVE": return "Aktiv";
        case "INACTIVE": return "Inaktiv";
        case "PROSPECT": return "Prospect";
        default: return "-";
    }
}

// Lägg till event listeners på redigeringsknapparna
function attachEditListeners() {
    document.querySelectorAll(".editContract").forEach(button => {
        button.addEventListener("click", function () {
            const contractId = this.getAttribute("data-id");
            window.location.href = `contract.html?id=${contractId}`;
        });
    });
}

// --------------------------------------------------------------
// Laddar ett enskilt kontrakt i formuläret på contract.html
// -------------------------------------------------------------
async function loadContract() {
    if (!contractIdGlobal) {
        console.warn("⚠️ Inget contractIdGlobal, kan inte hämta kontrakt.");
        return;
    }

    try {
        const response = await fetch(`${ENDPOINTS.contracts}/${contractIdGlobal}`);
        const contract = await response.json();

        console.log("✅ Kontrakt hämtat:", contract);
        contractNameGlobal = contract.company_name || "Okänt företag";
        console.log("🏢 Företagsnamn satt:", contractNameGlobal);

        await fillIndustryDropdown(contract.industry_id);

        // ✅ Fyll i formuläret direkt
        document.querySelector("#companyNub").value = contract.contract_id || "";
        document.querySelector("#companyName").value = contract.company_name || "";
        document.querySelector("#industry_id").value = contract.industry_id || "";
        document.querySelector("#contractStatus").value = contract.status.toString();
        document.querySelector("#refPerson").value = contract.ref_person || "";
        document.querySelector("#email").value = contract.email || "";
        document.querySelector("#phone").value = contract.phone || "";
        document.querySelector("#zip").value = contract.zip || "";
        document.querySelector("#address").value = contract.address || "";
        document.querySelector("#city").value = contract.city || "";
        document.querySelector("#payCond").value = contract.pay_cond || "";
        document.querySelector("#creditAssessed").value = contract.credit_assessed ? "Ja" : "Nej";
        document.querySelector("#invoiceModel").value = contract.invoice_model || "";
        document.querySelector("#registrationDate").value = contract.registration_date ? contract.registration_date.split("T")[0] : "";

        // ✅ Fyll i tjänster direkt i formuläret
        if (contract.services && contract.services.length > 0) {
            console.log("📌 Tjänster kopplade till kontraktet:", contract.services);

            contract.services.forEach(service => {
                if (service.member) document.querySelector("#member").checked = true;
                if (service.userdoc) document.querySelector("#userdoc").checked = true;
                if (service.todo) document.querySelector("#todo").checked = true;
                if (service.postit) document.querySelector("#postit").checked = true;
                if (service.inbound) document.querySelector("#inbound").checked = true;
                if (service.survey) document.querySelector("#survey").checked = true;
            });

        } else {
            console.warn("⚠️ Inga tjänster kopplade till kontraktet.");
        }

        // ✅ Ladda användare (fixad)
        await fetchAndRenderUsers();

    } catch (error) {
        console.error("❌ Fel vid hämtning av kontrakt:", error);
    }
}

// Fyller formuläret med kontraktsdata
function populateForm(contract) {
    console.log("🔍 Kör populateForm()...",contract );

    const formFields = {
        companyNub: contract.id,
        companyName: contract.company_name,
        contractStatus: contract.status.toString(),
        refPerson: contract.ref_person,
        email: contract.email,
        phone: contract.phone,
        zip: contract.zip,
        address: contract.address,
        city: contract.city,
        payCond: contract.pay_cond,  // ✅ Fixat! (tidigare var det felaktigt "pay_load")
        creditAssessed: contract.credit_assessed ? "Ja" : "Nej",
        invoiceModel: contract.invoice_model,
        registrationDate: contract.registration_date ? contract.registration_date.split("T")[0] : ""
    };

    for (const [id, value] of Object.entries(formFields)) {
        const input = document.querySelector(`#${id}`);
        if (input) {
            input.value = value;
        } else {
            console.warn(`Fält ${id} hittades inte i DOM!`);
        }
    }
}

// Skickar uppdaterad kontraktsdata till backend
async function saveContract() {
    const contractId = document.querySelector("#companyNub").value.trim();

    // Validera obligatoriska fält
    if (!validateContractForm()) return;

    // 🔍 Samla tjänster
    const services = {
        member: document.querySelector("#member").checked,
        userdoc: document.querySelector("#userdoc").checked,
        todo: document.querySelector("#todo").checked,
        postit: document.querySelector("#postit").checked,
        inbound: document.querySelector("#inbound").checked,
        survey: document.querySelector("#survey").checked
    };

    // 📦 Skapa payload
    const payload = {
        company_name: document.querySelector("#companyName").value,
        status: document.querySelector("#contractStatus").value,
        ref_person: document.querySelector("#refPerson").value,
        industry_id: document.querySelector("#industry_id")?.value || 1,
        email: document.querySelector("#email").value,
        phone: document.querySelector("#phone").value,
        zip: document.querySelector("#zip").value,
        address: document.querySelector("#address").value,
        city: document.querySelector("#city").value,
        pay_cond: document.querySelector("#payCond").value,
        credit_assessed: document.querySelector("#creditAssessed").value === "Ja",
        invoice_model: document.querySelector("#invoiceModel").value,
        services: [services]
    };

    if (contractId) {
        payload.contract_id = contractId;
    }

    try {
        const method = contractId ? "PUT" : "POST";
        const url = contractId ? `${ENDPOINTS.contracts}/${contractId}`
                        : `${ENDPOINTS.contracts}`;

        console.log(`${method === "PUT" ? "🔄 Uppdaterar" : "🆕 Skapar"} kontrakt...`);
        console.log("📦 Payload som skickas:", payload);

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ Kontrakt sparat:", result);
            alert("✅ Kontrakt sparat!");
            closeContractForm();
        } else {

            const errorData = await response.json();

            console.error("❌ Serverfel:", response.status, errorData);

            if (response.status === 409) {

                alert(`⚠️ ${errorData.detail}`);

            } else {

                alert("❌ Något gick fel vid sparandet.");

            }
        }

    } catch (error) {
        console.error("🚨 Fel vid sparande:", error);
        alert("🚨 Något gick fel vid sparandet.");
    }
}

// Stänger kontraktsformuläret och återgår till listan
function closeContractForm() {
    window.location.href = "mycontracts.html";
}
window.closeContractForm = closeContractForm;
window.saveContract = saveContract;

//-------------------------------------------------------------------
// 🔥 Funktion för att samla alla tjänster
// ------------------------------------------------------------------
function getServices() {
    let services = [
        {
            member: document.getElementById("member").checked,
            userdoc: document.getElementById("userdoc").checked,
            todo: document.getElementById("todo").checked,
            postit: document.getElementById("postit").checked,
            inbound: document.getElementById("inbound").checked,
            survey: document.getElementById("survey").checked
        }
    ];

    console.log(services); // 🔥 Debug-logg
    return services;
}

//-------------------------------------------------------------------
// 🔥 Funktion för att ladda alla tjänster
// ------------------------------------------------------------------
function loadServices(services) {
    console.log("🔄 Fyller i tjänster:", services);

    if (!services || services.length === 0) return;

    services.forEach(service => {
        if (service.member) document.querySelector("#member").checked = true;
        if (service.userdoc) document.querySelector("#userdoc").checked = true;
        if (service.todo) document.querySelector("#todo").checked = true;
        if (service.postit) document.querySelector("#postit").checked = true;
        if (service.inbound) document.querySelector("#inbound").checked = true;
        if (service.survey) document.querySelector("#survey").checked = true;
    });
}

// ------------------------------------------------------------------
// Skapa kontrakt
// ------------------------------------------------------------------
async function createContract() {
    console.log("Skapar nytt kontrakt...");

    let contractData = {
        company_name: document.querySelector("#companyName").value.trim(),
        ref_person: document.querySelector("#refPerson").value.trim(),
        email: document.querySelector("#email").value.trim(),
        phone: document.querySelector("#phone").value.trim(),
        zip: document.querySelector("#zip").value.trim(),
        address: document.querySelector("#address").value.trim(),
        city: document.querySelector("#city").value.trim(),
        pay_cond: document.querySelector("#payCond").value.trim(),
        credit_assessed: document.querySelector("#creditAssessed").value === "Ja",
        invoice_model: document.querySelector("#invoiceModel").value.trim() || null,
        registration_date: document.querySelector("#registrationDate").value || null,
        status: document.querySelector("#contractStatus").value === "true",
        services: getServices() // 🔥 Se till att services alltid skickas!
    };

    // 🔥 Debug-logg innan requesten skickas
    console.log("🚀 POST Payload:", JSON.stringify(contractData, null, 2));

    try {
        const response = await fetch(`${BASE_URL}/contracts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contractData)
        });

        if (!response.ok) throw new Error("Misslyckades att skapa kontrakt");
        const responseData = await response.json();

        console.log("✅ POST Response:", responseData);
        return responseData;
    } catch (error) {
        console.error("❌ Fel vid skapande av kontrakt:", error);
        throw error;
    }
}

// ----------------------------------------------------------------------------
// Uppdatera kontrakt
// ----------------------------------------------------------------------------
async function updateContract(contractId) {
    console.log(`🔄 Uppdaterar kontrakt med ID: ${contractId}`);

    if (!contractId) {
        console.error("❌ Ingen contractId angiven!");
        return;
    }

    // 🔥 Hämta data från formuläret
    const payload = {
        company_name: document.querySelector("#companyName").value.trim(),
        ref_person: document.querySelector("#refPerson").value.trim(),
        email: document.querySelector("#email").value.trim(),
        phone: document.querySelector("#phone").value.trim(),
        zip: document.querySelector("#zip").value.trim(),
        address: document.querySelector("#address").value.trim(),
        city: document.querySelector("#city").value.trim(),
        pay_cond: document.querySelector("#payCond").value.trim(),
        invoice_model: document.querySelector("#invoiceModel").value.trim(),
        credit_assessed: document.querySelector("#creditAssessed").checked,
        registration_date: document.querySelector("#registrationDate").value,
        status: document.querySelector("#contractStatus").value === "true",

        // 🔥 Hämta markerade tjänster
        services: [
            {
                member: document.querySelector("#member").checked,
                userdoc: document.querySelector("#userdoc").checked,
                todo: document.querySelector("#todo").checked,
                postit: document.querySelector("#postit").checked,
                inbound: document.querySelector("#inbound").checked,
                survey: document.querySelector("#survey").checked
            }
        ]
    };

    console.log("📌 Payload som skickas i PUT:", payload);

    try {
        const response = await fetch(`${ENDPOINTS.contracts}/${contractIdGlobal}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log(`✅ Kontrakt ${contractId} + tjänster uppdaterade!`);
            window.location.href = "../janitorPages/mycontracts.html";  // 🔄 stänger och åtregår
        } else {
            const errorText = await response.text();
            console.error("❌ Misslyckades att uppdatera kontrakt:", errorText);
        }
    } catch (error) {
        console.error("❌ Fel vid uppdatering:", error);
    }
}

// ----------------------------------------------------------------------------
// Raderar kontrakt
// ----------------------------------------------------------------------------
async function deleteContract(contractId) {
    console.log(`🗑️ Försöker radera kontrakt: ${contractId}`); // 🔥 Debug-logg

    if (!contractId) {
        console.error("❌ Ingen contractId angiven!");
        return;
    }

    try {
        const response = await fetch(`${ENDPOINTS.contracts}/${contractId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            console.log(`✅ Kontrakt ${contractId} raderat`);

            // 🔥 Kontrollera om elementet finns innan vi försöker ta bort det
            const contractElement = document.querySelector(`#contract-${contractId}`);
            if (contractElement) {
                contractElement.remove(); // Tar bort kontraktets rad i frontend
                console.log(`🗑️ Element för kontrakt ${contractId} borttaget från DOM`);
            } else {
                console.warn(`⚠️ Kunde inte hitta element för kontrakt ID: ${contractId}`);
            }

            // 🔥 Uppdatera kontraktslistan efter radering
            await fetchAndRenderContracts();
        } else {
            const errorMsg = await response.text();
            console.error("❌ Misslyckades att radera kontrakt:", errorMsg);
        }
    } catch (error) {
        console.error("❌ Fel vid radering:", error);
    }
}

// ---------------------------------------------------------------------------
// Hämtar användare från users
// ---------------------------------------------------------------------------
async function fetchAndRenderUsers() {
    if (!contractNameGlobal) {
        console.warn("⚠️ Ingen contractNameGlobal, kan inte hämta användare!");
        return;
    }

    try {
        const response = await fetch(`${ENDPOINTS.users.replace(":id", contractIdGlobal)}`);

        if (response.status === 404) {
            console.info("ℹ️ Inga användare kopplade till kontraktet ännu.");
            document.querySelector("#usersTableBody").innerHTML = "<tr><td colspan='3'>Inga användare kopplade ännu.</td></tr>";
            return;
        }

        if (!response.ok) {
            throw new Error("Misslyckades att hämta användare");
        }

        loadedUsers = await response.json();

        const tbody = document.querySelector("#usersTableBody");
        tbody.innerHTML = "";

        loadedUsers.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.rights}</td>
                <td><button class="btn btn-primary btn-sm editUser" data-id="${user.id}">Redigera</button></td>
            `;
            tbody.appendChild(row);
        });

        // Aktivera knappar
        document.querySelectorAll(".editUser").forEach(button => {
            button.addEventListener("click", function () {
                openUserModal(this.getAttribute("data-id"));
            });
        });

    } catch (error) {
        console.error("❌ Fel vid hämtning av användare:", error);
    }
}

// ------------------------------------------------------------------
// Öpnar modalen och hämtar användar data
// ------------------------------------------------------------------
function openUserModal(userId) {
    const user = loadedUsers.find(u => u.id == userId);
    if (!user) return console.error("Kunde inte hitta användaren med ID:", userId);

    // 🔁 Spara ID för användning vid uppdatering
    currentUserId = userId;

    // 🎯 Plocka ut elementen
    const nameInput     = document.querySelector("#userName");
    const emailInput    = document.querySelector("#userEmail");
    const rightsSelect  = document.querySelector("#userRights");
    const statusSelect = document.querySelector("#userActive");
    const hiddenIdInput = document.querySelector("#userId");

    if (!nameInput || !emailInput || !rightsSelect || !statusSelect || !hiddenIdInput) {
        console.error("❌ Ett eller flera inputfält kunde inte hittas i DOM!");
        return;
    }

    // 🟢 Sätt fältvärden
    hiddenIdInput.value = user.id;
    nameInput.value     = user.name || "";
    emailInput.value    = user.email || "";
    rightsSelect.value  = user.rights || "NONE";
    statusSelect.value = user.active ? "1" : "0";

    // 📢 Visa modalen (Bootstrap 5-stil)
    const modal = new bootstrap.Modal(document.getElementById("userModal"));
    modal.show();
}


//----------------------------------------------------------------
// Sparar ändringar på användardata
// --------------------------------------------------------------
async function saveUserChanges() {
    const userIdInput = document.querySelector("#userId");
    const rightsSelect = document.querySelector("#userRights");
    const activeSelect = document.querySelector("#userActive");

    if (!userIdInput || !rightsSelect || !activeSelect) {
        console.error("Ett eller flera fält saknas i modalen.");
        return;
    }

    const userId = userIdInput.value;
    const rights = rightsSelect.value;
    const active = activeSelect.value === "1";

    console.log("Sparar ändringar för användare:", userId);

    const payload = {
        rights,
        active
    };

    try {
        const response = await fetch(`${ENDPOINTS.users.replace(":id", contractIdGlobal)}/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Misslyckades att uppdatera användare");

        console.log("✅ Användare uppdaterad!");

        $('#userModal').modal('hide');

        await fetchAndRenderUsers();
    } catch (error) {
        console.error("❌ Fel vid uppdatering av användare:", error);
    }
}

//-------------------------------------------------------------
// Validierar kontraktsformuläret
//-------------------------------------------------------------
function validateContractForm() {
    const companyName = document.querySelector("#companyName").value.trim();
    const refPerson = document.querySelector("#refPerson").value.trim();
    const email = document.querySelector("#email").value.trim();

    if (!companyName || !refPerson || !email) {
        alert("⚠️ Företagsnamn, kontaktperson och e-post är obligatoriska!");
        return false; // 🔒 STOPP
    }

    return true; // Allt ser bra ut
}

//---------------------------------------------------
// Skapar dropdown för bransch
//---------------------------------------------------
async function fillIndustryDropdown(selectedId = null) {
    try {
        const res = await fetch(ENDPOINTS.industries);
        const industries = await res.json();

        const dropdown = document.querySelector("#industry_id");
        if (!dropdown) return;

        dropdown.innerHTML = `<option value="1">Ej klassad</option>`;

        industries.forEach(ind => {
            const opt = document.createElement("option");
            opt.value = ind.ind_id;
            opt.textContent = ind.name;
            if (selectedId && ind.ind_id == selectedId) {
                opt.selected = true;
            }
            dropdown.appendChild(opt);
        });
    } catch (err) {
        console.error("❌ Kunde inte ladda branscher:", err);
    }
}



