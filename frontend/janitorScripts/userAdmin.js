import { ENDPOINTS } from "../myconfig.js";

// Enum för rollöversättning
const ROLE_TRANSLATIONS = {
    "ADMIN": "Administratör",
    "CUSTOMER": "Kund",
    "SUPPLIER": "Leverantör",
    "PROSPECT": "Prospekt",
    "QUALIFIED_PROSPECT": "Kvalificerad",
    "DROPPED": "Avslutad"
};

document.addEventListener("DOMContentLoaded", async () => {
    initListeners();
    await loadContracts();
    await fetchUsers();
});

// Hämta och rendera användare
async function fetchUsers() {
    try {
        const res = await fetch(ENDPOINTS.allUsers);
        if (!res.ok) throw new Error("Kunde inte hämta användare");
        const users = await res.json();
        renderUsers(users);
    } catch (err) {
        console.error("Fel vid hämtning:", err);
    }
}

// Rendera användartabell
function renderUsers(users) {
    const tbody = document.querySelector("#userTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    users.forEach(user => {
        const row = document.createElement("tr");
        row.dataset.contractId = user.contract_id; // 👈 detta tillägg
        row.dataset.role = user.role; // 👈 lägg till detta
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.company_name}</td>
            <td>${user.full_name || `${user.c_name} ${user.s_name}`}</td>
            <td>${user.email}</td>
            <td>${user.status}</td>
            <td>${ROLE_TRANSLATIONS[user.role] || user.role}</td>
            <td>${user.rights}</td>
            <td>
                <button class="btn btn-warning btn-sm">Redigera</button>
                <button class="btn btn-danger btn-sm">Radera</button>
            </td>
        `;
        row.querySelector(".btn-warning").addEventListener("click", () => editUser(user.id));
        row.querySelector(".btn-danger").addEventListener("click", () => deleteUser(user.id));
        tbody.appendChild(row);
    });
}

// Hämta en användare och öppna modal
async function editUser(id) {
    try {
        const res = await fetch(ENDPOINTS.updateUser(id));
        if (!res.ok) throw new Error("Kunde inte hämta användardata");

        const user = await res.json();
        console.log("🔍 Backend-data:", user);

        const modalEl = document.querySelector("#userModal");
        if (!modalEl) return console.error("❌ Modal saknas i DOM!");

        const title = document.querySelector("#userModalLabel");
        if (title) title.textContent = "Redigera användare";

        // Visa modalen FÖRST
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        // Vänta tills modalen är i DOM
        setTimeout(() => {
            document.querySelector("#userId").value = user.id;
            document.querySelector("#company_name").value = user.contract_id;
            document.querySelector("#email").value = user.email;
            document.querySelector("#status").value = user.status;
            console.log("🧩 Status satt i fält:", document.querySelector("#status").value);
            document.querySelector("#accessLevel").value = user.rights;
            document.querySelector("#password").value = "";
            document.querySelector("#password").setAttribute("data-original", user.password_hash || "");

            const firstNameEl = document.querySelector("#firstName");
            const lastNameEl = document.querySelector("#lastName");

            if (user.name) {
                const parts = user.name.trim().split(" ");
                firstNameEl.value = parts.slice(0, -1).join(" ");
                lastNameEl.value = parts.slice(-1).join(" ");
                console.log("🧩 Förnamn satt till:", firstNameEl.value);
                console.log("🧩 Efternamn satt till:", lastNameEl.value);
            } else {
                firstNameEl.value = "";
                lastNameEl.value = "";
            }            

            const roleEl = document.querySelector("#modalRole");
            if (roleEl) {
                roleEl.value = user.role;
                console.log("✅ Roll satt:", user.role);
            } else {
                console.warn("⚠️ Rollfältet (#role) saknas");
            }
            console.log("📦 Status från backend:", user.status);

        }, 50);

    } catch (err) {
        console.error("💥 editUser kraschade:", err);
        alert("Kunde inte hämta användaren.");
    }
}

// Spara eller uppdatera användare
async function saveUser() {
    const id = document.querySelector("#userId").value;
    const userData = {
        id: id ? parseInt(id) : null,
        c_name: document.querySelector("#firstName").value.trim(),
        s_name: document.querySelector("#lastName").value.trim(),
        email: document.querySelector("#email").value.trim(),
        role: document.querySelector("#modalRole").value,
        status: document.querySelector("#status").value,
        password_hash: document.querySelector("#password").value || document.querySelector("#password").getAttribute("data-original"),
        rights: document.querySelector("#accessLevel").value,
        contract_id: parseInt(document.querySelector("#company_name").value),
        active: true
    };    

    if (!id && (!userData.c_name || !userData.s_name || !userData.email || !userData.contract_id)) {
        alert("Fyll i alla obligatoriska fält!");
        return;
    }   

    try {
        const res = await fetch(id ? ENDPOINTS.updateUser(id) : ENDPOINTS.addUser, {
            method: id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });

        console.log("📦 Skickad payload:", userData);

        if (!res.ok) throw new Error(await res.text());

        alert("Användare sparad!");
        bootstrap.Modal.getInstance(document.querySelector("#userModal")).hide();
        await fetchUsers();
    } catch (err) {
        console.error("Fel vid sparande:", err);
    }
}

// Radera användare
async function deleteUser(id) {
    if (!confirm("Vill du radera denna användare?")) return;
    try {
        const res = await fetch(ENDPOINTS.deleteUser(id), { method: "DELETE" });
        if (!res.ok) throw new Error("Kunde inte radera användaren");
        await fetchUsers();
    } catch (err) {
        console.error("Fel vid radering:", err);
    }
}

// Ladda kontrakt till dropdowns
async function loadContracts() {
    try {
        const res = await fetch(ENDPOINTS.contracts);
        const contracts = await res.json();

        const dropdown = document.querySelector("#company_name");
        const filter = document.querySelector("#filterContract");

        if (dropdown) {
            dropdown.innerHTML = "<option value=''>Välj kontrakt</option>";
            contracts.forEach(c => {
                const o = document.createElement("option");
                o.value = c.contract_id;
                o.textContent = c.company_name;
                dropdown.appendChild(o);
            });
        }

        if (filter) {
            filter.innerHTML = "<option value=''>Alla Kontrakt</option>";
            contracts.forEach(c => {
                const o = document.createElement("option");
                o.value = c.contract_id;
                o.textContent = c.company_name;
                filter.appendChild(o);
            });
        }

    } catch (err) {
        console.error("Fel vid hämtning av kontrakt:", err);
    }
}

// Filtrera användare live
function filterUsers() {
    const contractFilter = document.querySelector("#filterContract")?.value || "";
    const userFilter = document.querySelector("#searchUser")?.value.toLowerCase() || "";
    const roleFilter = document.querySelector("#searchRole")?.value.toLowerCase() || "";

    document.querySelectorAll("#userTableBody tr").forEach(row => {
        const contractId = row.dataset.contractId || "";
        const user = row.children[2]?.textContent.toLowerCase() || "";
        const role = row.dataset.role?.toLowerCase() || "";

        let match = true;
        if (contractFilter && contractFilter !== contractId) match = false;
        if (userFilter && !user.includes(userFilter)) match = false;
        if (roleFilter && role !== roleFilter) match = false;

        row.style.display = match ? "" : "none";
    });
}

// Töm formulär
function resetUserForm() {
    const title = document.querySelector("#userModalLabel");
    if (title) title.textContent = "Ny användare";

    document.querySelector("#userId").value = "";
    document.querySelector("#company_name").value = "";
    document.querySelector("#firstName").value = "";
    document.querySelector("#lastName").value = "";
    document.querySelector("#email").value = "";
    document.querySelector("#modalRole").value = "CUSTOMER";
    document.querySelector("#status").value = "ACTIVE";
    document.querySelector("#accessLevel").value = "NONE";
    document.querySelector("#password").value = "";
    document.querySelector("#password").setAttribute("data-original", "");
}

// Init-lyssnare
function initListeners() {
    document.querySelector("#saveUserButton")?.addEventListener("click", saveUser);

    document.querySelector("#addUserButton")?.addEventListener("click", () => {
        resetUserForm();
        const title = document.querySelector("#userModalLabel");
        if (title) title.textContent = "Ny användare";
        new bootstrap.Modal(document.querySelector("#userModal")).show();
    });

    document.querySelector("#filterContract")?.addEventListener("change", filterUsers);
    document.querySelector("#searchUser")?.addEventListener("input", filterUsers);
    document.querySelector("#searchRole")?.addEventListener("change", filterUsers);
}
