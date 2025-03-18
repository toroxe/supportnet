//Global konstant
const BASE_URL = "https://my.supportnet.se/api";

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
                // Fullständig URL till backend
                //const BASE_URL = "https://my.supportnet.se/api";
                const response = await fetch(`${BASE_URL}/send_contact_email`, {
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

 /*********************  Hantera registreringsformuläret *************************************************/
 document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.querySelector("[name='registerForm']");

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData(registerForm);

            // Skapa payload för backend
            const payload = {
                c_name: formData.get("c_name"),
                s_name: formData.get("s_name"),
                email: formData.get("email"),
                password_hash: formData.get("password"),
                company_name: "MySupportNet", // ✅ Default företag
                role: "CUSTOMER", // ✅ Standardroll
                status: "ACTIVE", // ✅ Lägger till status
                rights: "READ" // ✅ Standardrättighet
            };

            console.log("Payload som skickas till /users:", payload);

            try {
                const registerResponse = await fetch(`${BASE_URL}/users`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                const responseData = await registerResponse.json();

                if (!registerResponse.ok) {
                    console.error("Fel vid registrering:", responseData);

                    // Om backend returnerar valideringsfel, visa detaljerade meddelanden
                    if (responseData.detail) {
                        const errorMessages = responseData.detail.map(err => `${err.loc.join(" -> ")}: ${err.msg}`).join("\n");
                        alert("Fel vid registrering:\n" + errorMessages);
                    } else {
                        alert("Fel vid registrering: " + (responseData.message || "Okänt fel inträffade."));
                    }
                    return;
                }

                console.log("✅ Användardata från /users:", responseData);

                // Kontrollera att nödvändig data finns innan vi skickar mail
                if (!responseData.email || !responseData.c_name || !responseData.s_name) {
                    alert("Registrering lyckades, men kunde inte skicka välkomstmail.");
                    console.error("⚠️ Ofullständig användardata:", responseData);
                    return;
                }

                // 🔥 Skicka välkomstmail
                const emailPayload = {
                    email: responseData.email,
                    name: `${responseData.c_name} ${responseData.s_name}`,
                };

                console.log("📧 Payload som skickas till /send_welcome_email:", emailPayload);

                const emailResponse = await fetch(`${BASE_URL}/send_welcome_email`, {
                    method: "POST",
                    body: JSON.stringify(emailPayload),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!emailResponse.ok) {
                    const emailError = await emailResponse.json();
                    console.error("❌ Fel vid skickning av välkomstmail:", emailError);
                    alert("Registrering lyckades, men skickning av välkomstmail misslyckades.");
                    return;
                }

                console.log("✅ Välkomstmail skickat!");

                // Framgångsmeddelande om allt lyckas
                alert("🎉 Registrering lyckades och välkomstmail skickat!");
                registerForm.reset(); // Töm formuläret
                window.location.href = "../userapi/login.html"; // ✅ Redirect till login-sidan

            } catch (error) {
                console.error("❌ Ett tekniskt fel inträffade:", error);
                alert("Ett tekniskt fel uppstod, vänligen försök igen senare.");
            }
        });
    } else {
        console.error("❌ Kunde inte hitta formuläret i DOM.");
    }
});

