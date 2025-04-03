document.addEventListener("DOMContentLoaded", async () => {
    console.log("📝 Initierar Usecase...");

    const ok = await initUserSession();
    if (!ok) return;

    const contractId = sessionStorage.getItem("contract_id");
    const userId = sessionStorage.getItem("user_id");
    const username = sessionStorage.getItem("user") || "Vän";

    const form = document.querySelector("form");
    const cb = document.getElementById("surveyToggle");
    const block = document.getElementById("analysisBlock");

    // Förifyll fält
    document.querySelector('input[name="created_date"]').value = new Date().toISOString().split("T")[0];
    document.querySelector('input[name="username"]').value = username;

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
        const payload = {
            user_id: parseInt(userId),
            contract_id: parseInt(contractId),
            username,
            created_date: f["created_date"].value,
            frustration: f["frustration"].value,
            waste: f["waste"].value,
            critical: f["critical"].value,
            errors: f["errors"].value,
            unused_data: f["unused_data"].value,
            feedback_time: f["feedback_time"].value,
            accounting: f["accounting"].value,
            erp_system: f["erp_system"].value,
            analysis: f["analysis"].value,
            suggestions: f["suggestions"].value
        };

        const r = await fetch(`${BASE_URL}usecase`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (r.status === 409) alert("⚠️ Analys finns redan.");
        else if (r.ok) {
            alert("✅ Inskickat.");
            form.reset();
        } else alert("❌ Fel vid inskick.");
    });
});









