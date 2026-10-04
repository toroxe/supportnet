// ------------------------------------------------------
// File: core/frontend/user/auth/user_auth.js
// Version: 3.2
// Source: Aktuell UTV-fil + läst auth.py och broker-klient
// Status: VERIFIED
// Verified: Tord UA/PASS 2026-10-04 – båda inloggningarna
// ------------------------------------------------------

import { ENDPOINTS } from "/js/myconfig.js";

console.log("🔐 userAuth.js laddad...");

// ------------------------------------------------------
// Vanlig användarinloggning
// ------------------------------------------------------

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

        window.location.href = "/user/pages/userDashboard.html";

    } catch (err) {
        console.error("❌ Inloggning misslyckades:", err.message);
        alert(`Felaktig inloggning: ${err.message}`);
    }

    console.log("TOKEN:", data.access_token);
}

// ------------------------------------------------------
// Admininloggning via backend och IAM
// ------------------------------------------------------

async function loginAdminUser() {
    const email = document.querySelector("#admin-user")?.value.trim();
    const password = document.querySelector("#admin-pwd")?.value;

    if (!email || !password) {
        alert("Fyll i både e-post och lösenord!");
        return;
    }

    const loginButton = document.querySelector("#janitor-login");
    if (loginButton) loginButton.disabled = true;

    try {
        const response = await fetch(ENDPOINTS.login, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Inloggningen nekades (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        if (!data.token || data.user?.iam_decision !== "ALLOW") {
            throw new Error("IAM har inte godkänt administratörsåtkomst.");
        }

        sessionStorage.setItem("🔥full_auth", JSON.stringify(data));
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("userData", JSON.stringify(data.user));
        sessionStorage.setItem("contract_id", data.user.contract_id);

        console.log("Adminlogin: IAM ALLOW");
        window.location.href = `${location.origin}/admin/`;

    } catch (err) {
        console.error("Adminlogin misslyckades:", err.message);
        alert(err.message);
    } finally {
        if (loginButton) loginButton.disabled = false;
    }
}

// ------------------------------------------------------
// DOMContentLoaded
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.querySelector("#login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await loginUser();
        });
    }

    const janitorBtn = document.querySelector("#janitor-access-btn");
    const janitorModal = document.querySelector("#janitor-modal");
    const janitorCancel = document.querySelector("#janitor-cancel");
    const janitorLoginBtn = document.querySelector("#janitor-login");

    janitorBtn?.addEventListener("click", () => janitorModal.style.display = "block");
    janitorCancel?.addEventListener("click", () => janitorModal.style.display = "none");
    janitorLoginBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        loginAdminUser();
    });

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

    document.querySelector("#mail")?.addEventListener("focus", function () {
        if (this.value === "") {
            console.log("📌 Frågar om användare...");
            this.setAttribute("autocomplete", "email");
        }
    });

    document.querySelector("#janitor-login-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        loginAdminUser();
    });
});
