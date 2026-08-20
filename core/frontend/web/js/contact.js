import { ENDPOINTS } from "/js/myconfig.js";

const form = document.getElementById("contact-form");
const submitButton = document.getElementById("contact-submit");
const statusMessage = document.getElementById("contact-status");

function setStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = "contact-status";

    if (type) {
        statusMessage.classList.add(`contact-status--${type}`);
    }
}

function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    submitButton.setAttribute("aria-busy", String(isSubmitting));
    submitButton.querySelector("span").textContent = isSubmitting
        ? "Skickar..."
        : "Skicka meddelande";
}

async function readError(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        const data = await response.json();
        return data.detail || data.message || `HTTP ${response.status}`;
    }

    return (await response.text()) || `HTTP ${response.status}`;
}

form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    setStatus("");
    setSubmitting(true);

    try {
        const response = await fetch(ENDPOINTS.sendContact, {
            method: "POST",
            body: new FormData(form),
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(await readError(response));
        }

        form.reset();
        setStatus("Tack! Ditt meddelande är skickat.", "success");
    } catch (error) {
        console.error("Contact request failed:", error);
        setStatus(
            "Meddelandet kunde inte skickas just nu. Försök igen om en stund.",
            "error"
        );
    } finally {
        setSubmitting(false);
    }
});
