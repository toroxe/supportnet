const BASE_URL = "https://my.supportnet.se/api/contracts";
let contractIdGlobal = null;  // 🔥 Global variabel för ID
let contractNameGlobal = null;
let loadedUsers = []; // 🔥 Global variabel för att spara hämtade användare

//------------------------------------------
// test yta
// ----------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 DOMContentLoaded - Laddar kritiska funktioner...");

    // 🔍 Hämta URL-parametrar
    const urlParams = new URLSearchParams(window.location.search);
    contractIdGlobal = urlParams.get("id");
    contractNameGlobal = null; // Återställ innan vi laddar

    if (contractIdGlobal) {
        console.log("✅ Hittade contractIdGlobal i URL:", contractIdGlobal);

        // 🔥 Hämta kontraktsdata och sätt contractNameGlobal DIREKT
        try {
            const response = await fetch(`${BASE_URL}/${contractIdGlobal}`);
            const contract = await response.json();
            contractNameGlobal = contract.company_name;
            console.log("✅ Satt contractNameGlobal:", contractNameGlobal);
        } catch (error) {
            console.error("❌ Fel vid hämtning av kontrakt för namn:", error);
        }
    } else {
        console.warn("⚠️ Inget contractIdGlobal hittat i URL, skapar nytt.");
    }

    // 🔥 Om kontrakt-ID finns, ladda kontraktet
    if (contractIdGlobal) {
        console.log("📌 Kontrakt-ID identifierat:", contractIdGlobal);
        await loadContract();
    } else {
        console.warn("⚠️ Inget contractIdGlobal, skapar nytt vid behov.");
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

    console.log("✅ Alla funktioner är nu aktiva.");
});

// -------------------------------------------------------------------------
// Hämtar och renderar alla kontrakt i tabellen på mycontracts.html
// -------------------------------------------------------------------------
async function fetchAndRenderContracts() {
    try {
        const response = await fetch(BASE_URL);
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
            <td>${contract.id}</td>
            <td>${contract.company_name}</td>
            <td>${contract.status ? "Aktiv" : "Inaktiv"}</td>
            <td>${contract.ref_person}</td>
            <td>${contract.registration_date ? new Date(contract.registration_date).toLocaleDateString() : "Ej registrerad"}</td>
            <td>${contract.credit_assessed ? "Ja" : "Nej"}</td>
            <td>${contract.email}</td>
            <td>${contract.phone}</td>
            <td>
                <button class="btn btn-primary btn-sm editContract" data-id="${contract.id}">Redigera</button>
                <button class="btn btn-danger btn-sm deleteContract" data-id="${contract.id}">Radera</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    attachEditListeners(); // 🔥 Nu kopplar vi edit-knapparna
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
        const response = await fetch(`${BASE_URL}/${contractIdGlobal}`);
        const contract = await response.json();

        console.log("✅ Kontrakt hämtat:", contract);
        contractNameGlobal = contract.company_name || "Okänt företag"; 
        console.log("🏢 Företagsnamn satt:", contractNameGlobal);

        // ✅ Fyll i formuläret direkt
        document.querySelector("#companyNub").value = contract.id || "";
        document.querySelector("#companyName").value = contract.company_name || "";
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

    try {
        let response;
        if (contractId) {
            response = await updateContract(contractId);
        } else {
            response = await createContract(); // 🔥 Nu skickar vi tjänsterna korrekt
        }

        if (response) {
            console.log("Kontrakt sparat:", response);
            closeContractForm();
        } else {
            console.error("Fel: Ingen giltig respons från servern.");
        }
    } catch (error) {
        console.error("Fel vid sparande av kontrakt:", error);
    }
}

// Stänger kontraktsformuläret och återgår till listan
function closeContractForm() {
    window.location.href = "mycontracts.html";
}

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
            inbound: document.getElementById("inbound").checked
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
        const response = await fetch(BASE_URL, {
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
            }
        ]
    };

    console.log("📌 Payload som skickas i PUT:", payload);

    try {
        const response = await fetch(`${BASE_URL}/${contractId}`, {
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
        const response = await fetch(`${BASE_URL}/${contractId}`, {
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
    if (!contractNameGlobal) return console.warn("Ingen contractNameGlobal, kan inte hämta användare!");

    try {
        console.log(`Hämtar användare för kontrakt: ${contractNameGlobal}`);
        
        const response = await fetch(`${BASE_URL}/${contractNameGlobal}/users`);
        if (!response.ok) throw new Error("Misslyckades att hämta användare");

        loadedUsers = await response.json(); // 🔥 Spara för senare användning
        const tbody = document.querySelector("#usersTableBody");
        console.log(loadedUsers);

        tbody.innerHTML = ""; // Rensa tabellen innan ny rendering
        loadedUsers.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.rights}</td>
                <td><button class="btn btn-primary btn-sm editUser" data-id="${user.id}">Redigera</button></td>
            `;
            tbody.appendChild(row);
        });

        // ✅ Koppla event till redigeringsknappar
        document.querySelectorAll(".editUser").forEach(button => {
            button.addEventListener("click", function () {
                openUserModal(this.getAttribute("data-id"));
            });
        });

    } catch (error) {
        console.error("Fel vid hämtning av användare:", error);
    }
}

// ------------------------------------------------------------------
// Öpnar modalen och hämtar användar data
// ------------------------------------------------------------------
function openUserModal(userId) {
    console.log("Öppnar användarmodal för:", userId, "kontrakt:", contractNameGlobal);

    const user = loadedUsers.find(u => u.id == userId);
    if (!user) {
        console.error("Fel: Kunde inte hitta användare med ID", userId);
        return;
    }

    // ✅ Fyll modalen med användarens data
    document.querySelector("#userId").value = user.id;  // 🔥 Spara användarens ID
    document.querySelector("#userRights").value = user.rights;
    document.querySelector("#userActive").value = user.active ? "1" : "0";

    // ✅ Visa modalen
    $("#userModal").modal("show");
}

//----------------------------------------------------------------
// Sparar ändringar på användardata 
// --------------------------------------------------------------
async function saveUserChanges() {
    const userId = document.querySelector("#userId").value;
    if (!userId) {
        console.error("Fel: Användar-ID saknas!");
        return;
    }

    console.log("Sparar ändringar för användare:", userId);

    const userRights = document.querySelector("#userRights").value;
    const userActive = document.querySelector("#userActive").value === "1";

    let userData = {
        rights: userRights,
        active: userActive
    };

    console.log("Payload som skickas till PUT:", JSON.stringify(userData, null, 2));

    try {
        const response = await fetch(`${BASE_URL}/${contractNameGlobal}/users/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });

        if (!response.ok) throw new Error("Misslyckades att uppdatera användare");
        const updatedUser = await response.json();

        console.log("✅ Användare uppdaterad:", updatedUser);

        $("#userModal").modal("hide");
        await fetchAndRenderUsers();

    } catch (error) {
        console.error("Fel vid uppdatering av användare:", error);
    }
}

