const BASE_URL = "https://my.supportnet.se/api"; // Backend endpoint
let users = [];

// -----------------------------------------------------------------
// Säkerställer att DOM är laddad innan rendering
// -----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    console.log("janitor.js loaded");

    // Ladda användardata och rendera i tabellen samt fyller dropdwon
    //const users = await fetchUsers();
    //console.log(users);
    //renderUsers(users);
    fetchCompanyNames();

    // Event listener för att öppna modal för att lägga till ny användare
    const addUserButton = document.getElementById("addUserButton");
    if (addUserButton) {
        addUserButton.addEventListener("click", () => openUserModal());
    }

    // Event listener för att spara användare
    const saveUserButton = document.getElementById("saveUserButton");
    if (saveUserButton) {
        saveUserButton.addEventListener("click", saveUser);
    }
});

// -----------------------------------------------------------------
// Funktion: Hämtar användardata
// -----------------------------------------------------------------
async function fetchUsers() {
    try {
        const response = await fetch(`${BASE_URL}/users`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const users = await response.json();
        console.log("Hämtade användare:", users);
        renderUsers(users);
    } catch (error) {
        console.error("Fel vid hämtning av användare:", error);
        alert("Fel vid hämtning av användare: " + error);
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
function populateContractDropdown(companyNames) {
    console.log(companyNames);
    if (!Array.isArray(companyNames) || companyNames.length === 0) {
        console.warn("⚠️ populateContractDropdown fick ogiltiga data:", companyNames);
        return;
    }

    const contractDropdown = document.querySelector("#company_name");
    if (!contractDropdown) {
        console.error("❌ Fel: #company_name hittades inte i DOM!");
        return;
    }

    contractDropdown.innerHTML = "<option value=''>Välj kontrakt</option>";

    companyNames.forEach(contractName => {
        const option = document.createElement("option");
        option.value = contractName;
        option.textContent = contractName;
        contractDropdown.appendChild(option);
    });

    console.log("✅ Kontraktsdropdown uppdaterad:", contractDropdown);
}

// ----------------------------------------------------------------
// Rendera användardata
// ----------------------------------------------------------------
function renderUsers(users) {
    console.log(users)
    if (!Array.isArray(users)) {
        console.error("renderUsers fick ingen giltig array:", users);
        return;
    }
    const userTable = document.getElementById("userTable");
    userTable.innerHTML = "";
    users.forEach(user => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.company_name}</td>
            <td>${user.c_name} ${user.s_name}</td>
            <td>${user.email}</td>
            <td>${user.status}</td>
            <td>${user.role}</td>
            <td>${user.rights}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editUser(${user.id})">Redigera</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Radera</button>
            </td>
        `;
        userTable.appendChild(row);
    });
}

// -----------------------------------------------------------------
// Funktion: Öppna modal för att skapa eller redigera användare
// -----------------------------------------------------------------
async function openUserModal(user = null) {
    populateContracts();  // ✅ Laddar kontraktslistan

    console.log("🔍 Användardata till modalen:", user); // Debug

    // Dela upp namnet i förnamn & efternamn
    let nameParts = user?.name?.split(" ") || ["", ""];  
    let firstName = nameParts.slice(0, -1).join(" ");  // Allt utom sista ordet
    let lastName = nameParts.slice(-1).join(" ");      // Sista ordet blir efternamn

    document.querySelector("#userModalLabel").textContent = user ? "Redigera Användare" : "Ny Användare";
    document.querySelector("#userId").value = user?.id || "";
    document.querySelector("#company_name").value = user?.company_name || "";
    document.querySelector("#firstName").value = firstName;
    document.querySelector("#lastName").value = lastName;
    document.querySelector("#email").value = user?.email || "";
    document.querySelector("#role").value = user?.role || "CUSTOMER";
    document.querySelector("#status").value = user?.status || "ACTIVE";
    document.querySelector("#accessLevel").value = user?.rights || "NONE";
    document.querySelector("#password").value = ""; // Lösenord ska alltid vara tomt vid redigering

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
    const contractName = document.querySelector("#company_name")?.value || "";

    // 🟢 Ny variabel för att hålla det gamla lösenordet
    let originalPassword = document.querySelector("#password").getAttribute("data-original") || null;

    console.log("✅ Formdata:", { userId, firstName, lastName, email, role, status, rights, contractName, password, originalPassword });

    if (!firstName || !lastName || !email) {
        console.error("❌ Saknade fält i formuläret!", { firstName, lastName, email });
        alert("Alla fält måste fyllas i!");
        return;
    }

    // 🟢 Om användaren INTE fyllt i ett nytt lösenord, behåll det gamla
    let passwordToSend = password ? password : originalPassword;

    const userData = {
        id: userId ? parseInt(userId) : null,
        c_name: firstName,
        s_name: lastName,
        email: email,
        role: role,
        status: status,
        password_hash: password ? password : originalPassword, // Använd befintligt lösenord om inget nytt anges
        rights: rights,
        company_name: contractName,
        active: true // Säkerställ att active alltid finns
    };

    console.log("🚀 Skickar följande payload till backend:", userData);

    try {
        const method = userId ? "PUT" : "POST";
        const url = userId ? `${BASE_URL}/users/${userId}` : `${BASE_URL}/users`;

        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        alert("✅ Användaren sparades!");
        fetchUsers();  // Uppdatera listan
    } catch (error) {
        console.error("❌ Fel vid sparande av användare:", error);
        alert("Fel vid sparande av användare: " + error);
    }
}

// -----------------------------------------------------------------
// Funktion: Radera användare
// -----------------------------------------------------------------
async function deleteUser(id) {
    if (confirm("Är du säker på att du vill radera denna användare?")) {
        try {
            const response = await fetch(`${BASE_URL}/users/${id}`, { method: "DELETE" });
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
    const contractDropdown = document.querySelector("#searchContract");
    contractDropdown.innerHTML = '<option value="">Alla Kontrakt</option>'; // Reset dropdown
    
    try {
        const response = await fetch(`${BASE_URL}/contracts`);
        if (!response.ok) throw new Error(`Fel vid hämtning av kontrakt: ${response.status}`);

        const contracts = await response.json();
        contracts.forEach(contract => {
            const option = document.createElement("option");
            option.value = contract.company_name;
            option.textContent = contract.company_name;
            contractDropdown.appendChild(option);
        });
    } catch (error) {
        console.error("Fel vid hämtning av kontrakt:", error);
    }
    await populateContractDropdown(); // Ladda kontrakt i dropdown vid sidstart 
}

// -----------------------------------------------------------------
// Funktion: Filtrera användare baserat på sökfälten
// -----------------------------------------------------------------
function filterUsers() {
    const contractFilter = document.querySelector("#searchContract").value.toLowerCase();
    const userFilter = document.querySelector("#searchUser").value.toLowerCase();
    const roleFilter = document.querySelector("#searchRole").value.toLowerCase();

    document.querySelectorAll("#userTable tr").forEach(row => {
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

// -----------------------------------------------------------------
// Koppla sökning till fälten
// -----------------------------------------------------------------
document.querySelector("#searchContract").addEventListener("change", filterUsers);
document.querySelector("#searchUser").addEventListener("input", filterUsers);
document.querySelector("#searchRole").addEventListener("change", filterUsers);

// -----------------------------------------------------------------
// Ladda kontrakt och användare vid start
// -----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    await populateContracts();
    await fetchUsers();
    populateContractDropdown();
});
