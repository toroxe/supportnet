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
    console.log("i min RÅA",userDataRaw)

    console.log("📦 sessionStorage:", Object.fromEntries(Object.entries(sessionStorage)));

    if (!token || !userDataRaw) {
        sessionStorage.clear();
        window.location.href = "../auth/userLogin.html";
        return false;
    }

    let username = "Vän";

    try {
        const userData = JSON.parse(userDataRaw);
        if (userData && userData.c_name) {
            username = userData.c_name;
            sessionStorage.setItem("user", username);
        }

        if (!sessionStorage.getItem("contract_id") && userData.contract) {
            sessionStorage.setItem("contract_id", userData.contract);
            console.log("🔁 Återställde contract_id från userData:", userData.contract);
        }
    } catch (e) {
        console.warn("⚠️ Kunde inte tolka userData:", e);
    }

    await loadHeader(username);
    return true;
};

// ------------------------------------------------------------
// 📌 Kör automatiskt när DOM är redo
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    console.log("📌 userStandard – DOM redo, init startar");
    const ok = await initUserSession();
    if (!ok) return;

    const contractId = sessionStorage.getItem("contract_id");
    console.log("Kontrakts _ID:",contractId )

});






