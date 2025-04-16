// ------------------------------------------------------------
// 🌐 BASE_URL – global
// ------------------------------------------------------------
window.BASE_URL = location.origin + "/userapi/";
console.log("🌍 BASE_URL:", window.BASE_URL);

// ------------------------------------------------------------
// 🔗 Ladda userHeader
// ------------------------------------------------------------
async function loadHeader(username) {
    try {
        const res = await fetch("../userpages/userHeader.html");
        const html = await res.text();
        document.querySelector("#header-placeholder").innerHTML = html;

        document.querySelector("#dashboardUser").textContent = `Välkommen, ${username}`;
        document.querySelector("#logoutButton").addEventListener("click", () => {
            sessionStorage.clear();
            window.location.href = "../auth/userLogin.html";
        });
    } catch (error) {
        console.error("❌ Kunde inte ladda header:", error);
    }
}

// ------------------------------------------------------------
// 🚀 Huvudfunktion – init av session & header
// ------------------------------------------------------------
window.initUserSession = async function () {
    console.log("👑 initUserSession körs...");

    const token = sessionStorage.getItem("authToken");
    const userDataRaw = sessionStorage.getItem("userData");

    if (!token || !userDataRaw) {
        // 🔐 Rensa auth-relaterade nycklar
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("userData");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("contract_id");

        window.location.href = "../auth/userLogin.html";
        return false;
    }

    let username = "Vän";
    let contract_id = null;

    try {
        const userData = JSON.parse(userDataRaw);

        if (userData.c_name) {
            username = userData.c_name;
            sessionStorage.setItem("user", username);
        }

        if (userData.contract_id) {
            contract_id = userData.contract_id;
            if (!sessionStorage.getItem("contract_id")) {
                sessionStorage.setItem("contract_id", contract_id);
                console.log("🔁 Återställde contract_id från userData:", contract_id);
            }
        }

    } catch (e) {
        console.warn("⚠️ Kunde inte tolka userData:", e);
    }

    console.log("📦 sessionStorage:", Object.fromEntries(Object.entries(sessionStorage)));

    await loadHeader(username);
    return true;
};


// ------------------------------------------------------------
// 📌 Kör automatiskt när DOM är redo
// ------------------------------------------------------------
/*document.addEventListener("DOMContentLoaded", async () => {
    console.log("📌 userStandard – DOM redo, init startar");
    const ok = await initUserSession();
    if (!ok) return;

    const contractId = sessionStorage.getItem("contract_id");
    console.log("Kontrakts _ID:",contractId )

});*/






