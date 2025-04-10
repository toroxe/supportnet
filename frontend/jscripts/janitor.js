const BASE_URL = "https://my.supportnet.se/api"; // Backend endpoint
let users = [];

// -----------------------------------------------------------------
// Säkerställer att DOM är laddad innan rendering
// -----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    console.log("janitor.js loaded");

    const response = await fetch(`${BASE_URL}/contracts`);
    const contracts = await response.json();

    document.querySelector("#searchUser").addEventListener("input", filterUsers);
    populateContractDropdown(contracts);        // ✅ Skicka rätt objekt nu
    populateContracts();                        // dropdown i adminfiltret
    await fetchUsers();                         // användare
});

// -----------------------------------------------------------------
// Funktion: Hämtar användardata
// -----------------------------------------------------------------
async function fetchUsers() {
    try {
        const response = await fetch(`${BASE_URL}/users`);
        const users = await response.json();
        console.log("detta direkt från Maria:",users);
        if (!Array.isArray(users)) {
            console.warn("❌ Backend returnerade felmeddelande:", users?.error || users);
            return;
        }

        renderUsers(users);
    } catch (error) {
        console.error("🔥 Kunde inte hämta användare:", error);
    }
}

// -----------------------------------------------------------------
// Funktion: Hämtar alla kontrakt
// -----------------------------------------------------------------
async function fetchContracts() {
    try {
        const response = await fetch(`${BASE_URL}/contracts`);
        const data = await response.json();
        console.log("🔍 Hämtade kontrakt:", data);  // 🔥 Debug här!
        populateDropdown(data);
    } catch (error) {
        console.error("❌ Fel vid hämtning av kontrakt:", error);
    }
}

// ----------------------------------------------------------------
// Hämtar alla Bolagsnamn
// -----------------------------------------------------------------
async function fetchCompanyNames() {
    try {
        const response = await fetch(`${BASE_URL}/contracts`);
        const contracts = await response.json();
        console.log("✅ Hämtade kontrakt:", contracts);  

        if (!Array.isArray(contracts) || contracts.length === 0) {
            console.warn("⚠️ Inga kontrakt hittades!");
            return;
        }

        const companyNames = contracts.map(contract => contract.company_name);
        console.log("🔍 Företagsnamn:", companyNames);

        if (companyNames.length > 0) {
            setTimeout(() => populateContractDropdown(companyNames), 100); // 🔥 Liten delay för att undvika timing-problem
        } else {
            console.warn("⚠️ Ingen giltig lista med företagsnamn att fylla dropdown med!");
        }
    } catch (error) {
        console.error("❌ Fel vid hämtning av företagsnamn:", error);
    }
}

// -----------------------------------------------------------------
// Funktion: Rendera kontrakt i dropdown för användarformulär
// -----------------------------------------------------------------
function populateContractDropdown(contracts) {
    console.log("Detta från drop renderingen", contracts);

    const contractDropdown = document.querySelector("#company_name");
    if (!contractDropdown) {
        console.error("❌ Fel: #company_name hittades inte i DOM!");
        return;
    }

    contractDropdown.innerHTML = "<option value=''>Välj kontrakt</option>";

    contracts.forEach(contract => {
        const option = document.createElement("option");
        option.value = contract.contract_id;              // 🟢 Det vi sparar
        option.textContent = contract.company_name;       // 🟡 Det vi visar
        contractDropdown.appendChild(option);
    });

    console.log("✅ Kontraktsdropdown uppdaterad:", contractDropdown);
}

// ----------------------------------------------------------------
// Rendera användardata
// ----------------------------------------------------------------
function renderUsers(users) {
    if (!Array.isArray(users) || users.length === 0) {
        console.warn("⚠️ renderUsers fick ogiltig array:", users);
        return;
    }

    const userTableBody = document.querySelector("#userTableBody");
    if (!userTableBody) {
        console.error("❌ #userTableBody hittades inte i DOM!");
        return;
    }

    userTableBody.innerHTML = ""; // töm tidigare innehåll
    console.log("Detta är min user", users);
    users.forEach(user => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${user.id ?? "saknas"}</td>
            <td>${user.company_name ?? "saknas"}</td>
            <td>${user.full_name ?? "saknas"}</td>
            <td>${user.email}</td>
            <td>${user.status}</td>
            <td>${user.role}</td>
            <td>${user.rights}</td>
            <td>
                <button class="btn btn-warning btn-sm">Redigera</button>
                <button class="btn btn-danger btn-sm">Radera</button>
            </td>
        `;
            // Koppla redigera-knappen
        row.querySelector(".btn-warning").addEventListener("click", () => {
            editUser(user.id);
        });

        row.querySelector(".btn-danger").addEventListener("click", () => {
            deleteUser(user.id);
        });    

        userTableBody.appendChild(row);
    });

}

// -----------------------------------------------------------------
// Funktion: Öppna modal för att skapa eller redigera användare
// -----------------------------------------------------------------
async function openUserModal(user = null) {
    // 🔄 Hämta kontrakt till dropdownen
    const response = await fetch(`${BASE_URL}/contracts`);
    const contracts = await response.json();
    populateContractDropdown(contracts); // 🟢 Fyll dropdownen

    console.log("🔍 Användardata till modalen:", user);

    // 🧠 Förnamn + Efternamn
    let nameParts = user?.name?.split(" ") || ["", ""];
    let firstName = nameParts.slice(0, -1).join(" ");
    let lastName = nameParts.slice(-1).join(" ");

    // ⏳ Vänta tills dropdownen har fyllts
    setTimeout(() => {
        document.querySelector("#userModalLabel").textContent = user ? "Redigera Användare" : "Ny Användare";
        document.querySelector("#userId").value = user?.id || "";
        document.querySelector("#company_name").value = user?.contract_id || "";
        document.querySelector("#firstName").value = firstName;
        document.querySelector("#lastName").value = lastName;
        document.querySelector("#email").value = user?.email || "";
        document.querySelector("#role").value = user?.role || "CUSTOMER";
        document.querySelector("#status").value = user?.status || "ACTIVE";
        document.querySelector("#accessLevel").value = user?.rights || "NONE";
        document.querySelector("#password").value = "";
    }, 150); // Lite extra buffert så dropdownen hinner klart

    // 🪄 Visa modal
    const userModal = new bootstrap.Modal(document.querySelector("#userModal"));
    userModal.show();
}

// -----------------------------------------------------------------
// Funktion: Spara användare (Skapa eller Uppdatera)
// -----------------------------------------------------------------
async function saveUser() {
    console.log("🔍 Sparar användare...");

    const userId = document.querySelector("#userId")?.value || null;
    const firstName = document.querySelector("#firstName")?.value || "";
    const lastName = document.querySelector("#lastName")?.value || "";
    const email = document.querySelector("#email")?.value || "";
    const role = document.querySelector("#role")?.value || "";
    const status = document.querySelector("#status")?.value || "";
    const password = document.querySelector("#password")?.value || null;
    const rights = document.querySelector("#accessLevel")?.value || "";
    const contractId = parseInt(document.querySelector("#company_name")?.value || "0");

    if (!firstName || !lastName || !email || !contractId) {
        alert("❌ Alla fält måste fyllas i – inklusive kontrakt!");
        return;
    }

    const originalPassword = document.querySelector("#password").getAttribute("data-original") || null;
    const passwordToSend = password ? password : originalPassword;

    const userData = {
        id: userId ? parseInt(userId) : null,
        c_name: firstName,
        s_name: lastName,
        email: email,
        role: role,
        status: status,
        password_hash: passwordToSend,
        rights: rights,
        contract_id: contractId,
        active: true
    };

    console.log("🚀 Skickar följande payload till backend:", userData);

    try {
        const method = userId ? "PUT" : "POST";
        const url = userId ? `${BASE_URL}/users/${userId}` : `${BASE_URL}/users`;

        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        alert("✅ Användaren sparades!");
        fetchUsers();  // Uppdatera listan

        const userModalEl = document.querySelector("#userModal");
        const userModal = bootstrap.Modal.getInstance(userModalEl);
        if (userModal) userModal.hide();  // 🧼 Ta bort hela modal & dimma

    } catch (error) {
        console.error("❌ Fel vid sparande av användare:", error);
        alert("Det gick inte att spara användaren. Försök igen.\n" + error.message);
    }
}

// -----------------------------------------------------------------
// Funktion: Radera användare
// -----------------------------------------------------------------
async function deleteUser(id) {
    if (confirm("Är du säker på att du vill radera denna användare?")) {
        try {
            const response = await fetch(`${BASE_URL}/users/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });
            
            if (!response.ok) {
                throw new Error(`Kunde inte radera användare: ${response.status}`);
            }
            alert("Användaren har raderats.");
            fetchUsers(); // Uppdatera listan efter radering
        } catch (error) {
            console.error("Fel vid radering av användare:", error.message);
            alert("Det gick inte att radera användaren. Försök igen senare.");
        }
    }
}

// -----------------------------------------------------------------
// Funktion: Redigera en användare
// -----------------------------------------------------------------
async function editUser(id) {
    try {
        const response = await fetch(`${BASE_URL}/users/${id}`);
        if (!response.ok) {
            throw new Error(`Kunde inte hämta användardata: ${response.status}`);
        }
        const user = await response.json();
        
        // Sätt originalPassword till det hashade lösenordet från databasen
        document.querySelector("#password").setAttribute("data-original", user.password_hash || "");

        openUserModal(user); // Öppna modal med användardata
    } catch (error) {
        console.error("Fel vid hämtning av användardata:", error.message);
        alert("Kunde inte hämta användardata. Försök igen.");
    }
}

//------------------------------------------------------------------
// funktioner för sök o sotrering
// -----------------------------------------------------------------
// -----------------------------------------------------------------
// Funktion: Populera kontraktsfiltret dynamiskt
// -----------------------------------------------------------------
async function populateContracts() {
    const contractDropdown = document.querySelector("#filterContract"); // ✅ korrekt ID för adminfiltret
    if (!contractDropdown) {
        console.error("❌ Kan inte hitta #filterContract i DOM!");
        return;
    }

    contractDropdown.innerHTML = '<option value="">Alla Kontrakt</option>'; // Reset dropdown

    try {
        const response = await fetch(`${BASE_URL}/contracts`);
        if (!response.ok) throw new Error(`Fel vid hämtning av kontrakt: ${response.status}`);

        const contracts = await response.json();
        const companyNames = contracts.map(contract => contract.company_name);

        companyNames.forEach(contractName => {
            const option = document.createElement("option");
            option.value = contractName;
            option.textContent = contractName;
            contractDropdown.appendChild(option);
        });

        console.log("✅ Admin-kontraktsfilter uppdaterat:", companyNames);
    } catch (error) {
        console.error("❌ Fel vid hämtning av kontrakt:", error);
    }
}

// -----------------------------------------------------------------
// Funktion: Filtrera användare baserat på sökfälten
// -----------------------------------------------------------------
function filterUsers() {
    const contractFilter = document.querySelector("#filterContract").value.toLowerCase();
    const userFilter = document.querySelector("#searchUser").value.toLowerCase();
    const roleFilter = document.querySelector("#searchRole").value.toLowerCase();

    // Fel selektor:
    document.querySelectorAll("#userTableBody tr").forEach(row => {
        const contract = row.children[1]?.textContent.trim().toLowerCase() || "";
        const user = row.children[2]?.textContent.trim().toLowerCase() || "";
        const role = row.children[5]?.textContent.trim().toLowerCase() || "";

        let show = true;

        if (contractFilter && contract !== contractFilter) show = false;
        if (userFilter && !user.includes(userFilter)) show = false;
        if (roleFilter && role !== roleFilter) show = false;

        row.style.display = show ? "" : "none";
    });
}

//---------------------------------------------------------------------
// Tömmer alla fält inna skapa ny
//--------------------------------------------------------------------
function resetUserForm() {
    document.querySelector("#userModalLabel").textContent = "Ny användare";
    document.querySelector("#userId").value = "";
    document.querySelector("#company_name").value = "";
    document.querySelector("#firstName").value = "";
    document.querySelector("#lastName").value = "";
    document.querySelector("#email").value = "";
    document.querySelector("#role").value = "CUSTOMER";
    document.querySelector("#status").value = "ACTIVE";
    document.querySelector("#accessLevel").value = "NONE";
    document.querySelector("#password").value = "";
    document.querySelector("#password").setAttribute("data-original", "");
}

// -----------------------------------------------------------------
// Koppla sökning till fälten
// -----------------------------------------------------------------
document.querySelector("#filterContract").addEventListener("change", filterUsers);
document.querySelector("#searchUser").addEventListener("input", filterUsers);
document.querySelector("#searchRole").addEventListener("change", filterUsers);

document.querySelector("#addUserButton").addEventListener("click", () => {
    resetUserForm();             // 🧼 töm fälten
    openUserModal(null);        // 📦 öppna tom modal
});

document.querySelector("#saveUserButton").addEventListener("click", saveUser);