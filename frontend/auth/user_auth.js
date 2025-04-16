// ------------------------------------------------------
// userAuth.js – Version 3 (Jerker Approved™)
// ------------------------------------------------------

import { ENDPOINTS } from "../myconfig.js";

console.log("🔐 userAuth.js laddad...");

// ------------------------------------------------------
// 🧠 Funktioner
// ------------------------------------------------------

function validateTimeCode(inputCode) {
    const now = new Date();

    const getTimeCode = (offset = 0) => {
        const d = new Date(now.getTime() + offset * 60000);
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    };

    return [getTimeCode(-1), getTimeCode(0), getTimeCode(1)].includes(inputCode);
}

async function loginUser() {
    console.log("🔥 Försöker logga in...");

    const email = document.querySelector("#mail")?.value.trim();
    const password = document.querySelector("#pwd")?.value.trim();

    if (!email || !password) {
        alert("Fyll i både e-post och lösenord!");
        return;
    }

    try {
        const response = await fetch(ENDPOINTS.login, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        console.log(`🔍 Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Felaktigt användarnamn eller lösenord! Serverns svar: ${errorText}`);
        }

        const data = await response.json();
        console.log("✅ Inloggning lyckades:", data);

        sessionStorage.setItem("🔥full_auth", JSON.stringify(data));
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("userData", JSON.stringify(data.user));
        sessionStorage.setItem("contract", data.contract);

        const isMobile = /(Mobi|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Opera Mini|IEMobile)/i.test(navigator.userAgent);
        sessionStorage.setItem("deviceType", isMobile ? "mobile" : "pc");

        if (data.user.contract) {
            sessionStorage.setItem("contract_id", data.user.contract);
            console.log("📌 contract_id sparad i sessionStorage:", data.user.contract);
        } else {
            console.warn("⚠️ Inget contract_id returnerat!");
        }

        window.location.href = "../userpages/userDashboard.html";

    } catch (err) {
        console.error("❌ Inloggning misslyckades:", err.message);
        alert(`Felaktig inloggning: ${err.message}`);
    }
}

function loginAdminUser() {
    const code = document.querySelector("#admin-code")?.value.trim();

    if (!validateTimeCode(code)) {
        alert("❌ tick, tack, tick, tack");
        return;
    }

    console.log("🟢 Tidskod OK, dirigerar till adminDash");
    window.location.href = `${location.origin}/janitor.html`;
}

// ------------------------------------------------------
// 🚀 DOMContentLoaded
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // 🧼 Vanlig login
    const loginForm = document.querySelector("#login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await loginUser();
        });
    }

    // 🧼 Admin modal open/close
    const janitorBtn = document.querySelector("#janitor-access-btn");
    const janitorModal = document.querySelector("#janitor-modal");
    const janitorCancel = document.querySelector("#janitor-cancel");
    const janitorLoginBtn = document.querySelector("#janitor-login");

    janitorBtn?.addEventListener("click", () => janitorModal.style.display = "block");
    janitorCancel?.addEventListener("click", () => janitorModal.style.display = "none");
    janitorLoginBtn?.addEventListener("click", loginAdminUser);

    // 🧼 Modal-stängning
    const closeButton = document.querySelector("#close-login");
    if (closeButton) {
        closeButton.addEventListener("click", () => {
            const loginModal = document.querySelector("#login-modal");
            if (loginModal) {
                const modalInstance = bootstrap.Modal.getInstance(loginModal);
                if (modalInstance) modalInstance.hide();
            }
            setTimeout(() => {
                window.location.href = "/index.html";
            }, 300);
        });
    }

    // 🧼 Autocomplete-hint
    document.querySelector("#mail")?.addEventListener("focus", function () {
        if (this.value === "") {
            console.log("📌 Frågar om användare...");
            this.setAttribute("autocomplete", "email");
        }
    });

    // 🧼 Admin-submit
    document.querySelector("#janitor-login-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        loginAdminUser();
    });
});

