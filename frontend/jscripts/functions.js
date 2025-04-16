//Global konstant
import { ENDPOINTS } from "../myconfig.js";

console.log("functions.js är korrekt laddat!");

/*************** Funktion för att hantera formulärens "Mail" **********************************************/ 
document.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.getElementById("contact-form");


    document.addEventListener("DOMContentLoaded", () => {
        console.log("DOMContentLoaded triggat i functions.js");
    });
    
    console.log("DOMContentLoaded: DOM laddad");
    if (contactForm) {
        console.log("Hittade contactForm i DOM");
    }
    

    if (contactForm) {
        contactForm.addEventListener("submit", async (event) => {
            event.preventDefault(); // Förhindra standardformulärskick

            const formData = new FormData(contactForm);
                // Lägg till en console-logg för att se om vi når hit och vilka data som skickas
                console.log("Formulärdata skapad:", Object.fromEntries(formData.entries()));


            try {              
                const response = await fetch(ENDPOINTS.sendContact, {
                    method: "POST",
                    body: new URLSearchParams(formData), // Konvertera till URL-encoded format
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });

                if (!response.ok) {
                    const errorDetails = await response.text();
                    throw new Error(`Server Error: ${response.status} - ${errorDetails}`);
                }                

                const result = await response.json();
                alert("Meddelandet har skickats! Tack för att du kontaktade oss.");
                contactForm.reset(); // Återställ formuläret
            } catch (error) {
                console.error("Ett fel inträffade:", error);
                alert("Ett tekniskt fel uppstod, vänligen försök igen senare.");
            }
        });
    } else {
        console.warn("Contact form not found");
    }
});

 /*********************  Hantera registreringsformuläret! Detta för att testa ******************************/
document.addEventListener("DOMContentLoaded", () => {
const registerForm = document.querySelector("[name='registerForm']");

if (!registerForm) {
    console.error("❌ Formuläret [name='registerForm'] hittades inte.");
    return;
}

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);

    const payload = {
    c_name: formData.get("c_name"),
    s_name: formData.get("s_name"),
    email: formData.get("email"),
    password_hash: formData.get("password"),
    company_name: "MySupportNet",
    role: "CUSTOMER",
    status: "ACTIVE",
    rights: "READ",
    active: true
    };

    console.log("🚀 Skickar till /api/users:", payload);

    try {
    const res = await fetch(ENDPOINTS.registerUser, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
        const msg = data.detail
        ? data.detail.map(err => `${err.loc.join(" → ")}: ${err.msg}`).join("\n")
        : data.message || "Okänt fel.";
        alert("❌ Fel vid registrering:\n" + msg);
        return;
    }

    console.log("✅ Registrering lyckades:", data);

    // 🔍 Verifiera att vi har tillräckligt för att skicka mail
    if (!data.email || !data.c_name || !data.s_name) {
        console.warn("⚠️ Saknas data för mail, skippar utskick.");
        return;
    }

    const emailPayload = {
        email: data.email,
        name: `${data.c_name} ${data.s_name}`
    };

    console.log("📧 Skickar välkomstmail:", emailPayload);

    const mailRes = await fetch(ENDPOINTS.sendWelcome, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload)
    });

    const mailData = await mailRes.json();

    if (!mailRes.ok) {
        console.error("❌ Välkomstmail misslyckades:", mailData);
        alert("Registrering klar, men mail kunde inte skickas.");
        return;
    }

    console.log("✅ Mail skickat:", mailData);
    alert("🎉 Du är nu registrerad, kolla ditt välkomstmail!");
    registerForm.reset();
    window.location.href = "/auth/userLogin.html";

    } catch (err) {
    console.error("❌ Teknisk krasch:", err);
    alert("Något gick fel. Försök igen senare.");
    }
});
});  

