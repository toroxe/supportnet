document.addEventListener("DOMContentLoaded", async () => {
    console.log("📝 Initierar Usecase...");

    console.log("🔎 sessionStorage:", sessionStorage.getItem("contract_id"));

    const ok = await initUserSession();
    if (!ok) return;

    const contractIdRaw = sessionStorage.getItem("contract_id");
    const userIdRaw = sessionStorage.getItem("user_id");
    const user = JSON.parse(sessionStorage.getItem("userData"));

    const contractId = contractIdRaw ? parseInt(contractIdRaw) : null;
    const userId = userIdRaw ? parseInt(userIdRaw) : null;

    if (!userId || !contractId) {
        console.error("❌ user_id eller contract_id saknas i sessionStorage");
        alert("Kunde inte hämta kontraktsdata – kontrollera inloggning.");
        return;
    }

    const form = document.querySelector("form");
    const cb = document.getElementById("surveyToggle");
    const block = document.getElementById("analysisBlock");

    // Förifyll fält
    document.querySelector('input[name="created_date"]').value = new Date().toISOString().split("T")[0];
    if (user) {
        const fullName = `${user.c_name} ${user.s_name}`;
        document.querySelector('input[name="username"]').value = fullName;
    }

    document.querySelector("#contractDisplay").textContent = sessionStorage.getItem("contract_id") || "❌ Saknas!";


    // Checkbox styr analysblock
    cb.addEventListener("change", () => {
        const hide = cb.checked;
        [...form.elements].forEach(el => {
            if (!block.contains(el) && el.id !== "surveyToggle" && el.tagName !== "BUTTON") {
                el.closest("label")?.classList.toggle("d-none", hide);
                el.classList.toggle("d-none", hide);
            }
        });
        block.style.display = hide ? "block" : "none";
    });

    // Formulärinsändning
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const f = form.elements;
        const rawFeedback = f["feedback_time"].value;
        const feedback_time = rawFeedback.replaceAll(" ", "_");

        const payload = {
            user_id: userId,
            contract_id: contractId,
            username: `${user.c_name} ${user.s_name}`,
            created_date: new Date(f["created_date"].value).toISOString().split("T")[0],
            frustration: f["frustration"].value,
            waste: f["waste"].value,
            critical: f["critical"].value,
            errors: f["errors"].value,
            unused_data: f["unused_data"].value,
            feedback_time: feedback_time,
            accounting: f["accounting"].value,
            erp_system: f["erp_system"].value,
            analysis: f["analysis"].value,
            suggestions: f["suggestions"].value
        };

        console.log("📦 Payload som skickas:", payload);
        await postUsecaseData(payload, form);
    });
});
console.log("👀 Direkt check – contract_id i sessionStorage:", sessionStorage.getItem("contract_id"));

//-------------------------------------------------------------------------
// POST-funktion – separat och stabil
//-------------------------------------------------------------------------

async function postUsecaseData(data, formRef = null) {
    console.log("Detta är vad som kommer med formuläret:", data);
    try {
        const response = await fetch(`${BASE_URL}usecase`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (response.status === 409) {
            alert("⚠️ En analys för detta kontrakt finns redan.");
            return;
        }

        if (!response.ok) {
            throw new Error("Något gick fel vid POST");
        }

        const result = await response.json();
        console.log("✅ Usecase sparat:", result);
        alert("✅ Din survey är sparad.");
        if (formRef) formRef.reset();
        return result;
    } catch (error) {
        console.error("Fel vid POST:", error);
        alert("❌ Det gick inte att spara din survey.");
    }
}

