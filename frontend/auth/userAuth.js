// Konfigurationsinställningar för API-anrop
const BASE_URL = "https://my.supportnet.se/userapi";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.querySelector("#login-form");
    if (loginForm) {
        document.querySelector("#mail").value = "";
        document.querySelector("#pwd").value = "";
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loginUser();
        });
    }

    // 🔥 Koppla submit-knappen till loginfunktionen
    const loginButton = document.querySelector("#login-form button[type='submit']");
    if (loginButton) {
        loginButton.addEventListener("click", () => {
            console.log("🔍 Login-knapp klickad!");
            loginForm.requestSubmit(); // 🔥 Tvingar formuläret att skicka
        });
    }
});

// Funktion för att hantera inloggning
async function loginUser() {
    console.log("🔥 Försöker logga in...");

    const email = document.querySelector("#mail")?.value.trim();
    const password = document.querySelector("#pwd")?.value.trim();

    if (!email || !password) {
        alert("Fyll i både e-post och lösenord!");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        });

        console.log(`🔍 Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Felaktigt användarnamn eller lösenord! Serverns svar: ${errorText}`);
        }

        const data = await response.json();        
        console.log("✅ Inloggning lyckades:", data);
        sessionStorage.setItem("🔥full_auth", JSON.stringify(data));

        // 🟢 Spara token och användardata i sessionStorage
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("userData", JSON.stringify(data.user));
        sessionStorage.setItem("contract", data.contract);
        
        // 🟢 Identifiera enheten vid inloggning
        let isMobileDevice = /(Mobi|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Opera Mini|IEMobile)/i.test(navigator.userAgent);
        sessionStorage.setItem("deviceType", isMobileDevice ? "mobile" : "pc");
        console.log("📌 Enhetstyp sparad i sessionStorage:", sessionStorage.getItem("deviceType"));

        if (data.user.contract) {
            sessionStorage.setItem("contract_id", data.user.contract);
            console.log("📌 contract_id sparad i sessionStorage:", data.user.contract);
        } else {
            console.error("⛔ Inloggning returnerade INGEN contract_id!");
        }
        
        // 🔥 Redirect till dashboard
        window.location.href = "../userpages/userDashboard.html";

    } catch (error) {
        console.error("❌ Inloggning misslyckades:", error.message);
        alert(`Felaktig inloggning: ${error.message}`);
    }
}

//-----------------------------------------------------------------------------
// Triggar stängknappen på login formuläret
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const closeButton = document.querySelector("#close-login");

    if (closeButton) {
        closeButton.addEventListener("click", function () {
            console.log("🚪 Stänger inloggningsfönster och dirigerar till index.html");

            // Bootstrap modal-stängning
            const loginModal = document.querySelector("#login-modal");
            if (loginModal) {
                let modalInstance = bootstrap.Modal.getInstance(loginModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }

            // Omdirigera till index
            setTimeout(() => {
                window.location.href = "/index.html"; // 🔹 Justera sökvägen om det behövs
            }, 300);
        });
    } else {
        console.warn("⚠️ Stängknapp hittades inte!");
    }
});

document.querySelector("#mail").addEventListener("focus", function () {
    if (this.value === "") {
        console.log("📌 Frågar om användare...");
        this.setAttribute("autocomplete", "email");
    }
});

/*let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("📌 App kan installeras!");
    document.getElementById("installPWA").style.display = "block"; // Visa install-knapp
});

document.querySelector("#installPWA").addEventListener("click", () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
                console.log("✅ App installerad!");
            } else {
                console.log("❌ Användaren avbröt installationen.");
            }
            deferredPrompt = null;
        });
    }
});*/





