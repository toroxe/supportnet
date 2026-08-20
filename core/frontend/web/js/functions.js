// ------------------------------------------------------
// functions.js – FIXED VERSION (render-safe)
// ------------------------------------------------------

import { ENDPOINTS } from "/js/myconfig.js";

console.log("functions.js laddad ✅");

// ------------------------------------------------------
// 📩 CONTACT FORM (GLOBAL LISTENER – FUNKAR MED render.js)
// ------------------------------------------------------
document.addEventListener("click", async (event) => {

    if (event.target && event.target.id === "send-btn") {

        console.log("🔥 Klick på skicka!");

        const payload = {
            name: document.getElementById("name")?.value,
            email: document.getElementById("email")?.value,
            message: document.getElementById("message")?.value
        };

        console.log("📤 Skickar contact:", payload);

        try {
            const formData = new FormData();
            formData.append("name", payload.name);
            formData.append("email", payload.email);
            formData.append("message", payload.message);

            const response = await fetch(ENDPOINTS.sendContact, {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error(await response.text());

            alert("✅ Meddelande skickat!");

        } catch (error) {
            console.error("❌ Contact error:", error);
            alert("Fel vid skickning");
        }
    }
});

// ------------------------------------------------------
// 🧪 REGISTER FORM (GLOBAL LISTENER)
// ------------------------------------------------------
document.addEventListener("submit", async (event) => {

    const form = event.target;

    if (!form || form.name !== "registerForm") return;

    event.preventDefault();

    console.log("🧪 Register submit triggad!");

    const formData = new FormData(form);

    const payload = {
        c_name: formData.get("c_name"),
        s_name: formData.get("s_name"),
        email: formData.get("email"),
        password: formData.get("password")
    };

    console.log("🚀 Skickar register:", payload);

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

        console.log("✅ Registrering OK:", data);

        const emailPayload = {
            email: data.email,
            name: `${data.c_name} ${data.s_name}`
        };

        const mailRes = await fetch(ENDPOINTS.sendWelcome, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailPayload)
        });

        if (!mailRes.ok) {
            console.warn("⚠️ Mail misslyckades");
            alert("Registrering klar, men mail kunde inte skickas.");
            return;
        }

        alert("🎉 Registrerad! Kolla din mail.");
        form.reset();
        window.location.href = "/auth/userLogin.html";

    } catch (err) {
        console.error("❌ Register crash:", err);
        alert("Tekniskt fel – försök igen senare.");
    }
});
