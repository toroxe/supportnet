import { ENDPOINTS } from "../myconfig.js";

document.addEventListener("DOMContentLoaded", () => {

  const form = document.querySelector("#servicesForm");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#name").value;
    const company = document.querySelector("#company").value;
    const email = document.querySelector("#email").value;
    const selectedService = document.querySelector('input[name="service"]:checked')?.value;

    const serviceMap = {
      "kunskap": "knowledge",
      "radgivning": "advice",
      "tjanster": "services"
    };

    const translatedService = serviceMap[selectedService];

    if (!translatedService) {
      alert("Vänligen välj en tjänst.");
      return;
    }

    const formData = {
      name: name,
      company: company,
      email: email,
      service_choice: translatedService
    };

    console.log("📦 Skickar data till backend:", formData);

    try {
      // Steg 1: kolla om e-post finns
      const checkRes = await fetch(ENDPOINTS.checkEmail + `?email=${email}`);
      const checkData = await checkRes.json();

      const method = checkData.exists ? "PATCH" : "POST";
      const endpoint = checkData.exists ? ENDPOINTS.updateService : ENDPOINTS.submitService;

      // Om tjänsten redan är vald, avbryt
      if (checkData.exists && checkData.services.includes(translatedService)) {
        alert("Du har redan registrerat dig för denna tjänst.");
        return;
      }

      // Steg 2: skapa eller uppdatera användare
      const saveRes = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const saveData = await saveRes.json();

      if (saveRes.ok) {
        alert("Tjänsten har registrerats och bekräftelse skickats.");
        form.reset();
      } else {
        alert(`Fel: ${saveData.detail || "Okänt fel"}`);
      }

    } catch (error) {
      console.error("❌ Fetch-fel:", error);
      alert("Ett tekniskt fel inträffade – försök igen senare.");
    }
  });
});