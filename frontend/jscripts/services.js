const BASE_URL = "https://my.supportnet.se";

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

    console.log("Skickar detta: ", formData);

    try {
      // Kolla om användaren finns
      const checkRes = await fetch(`${BASE_URL}/api/check-email?email=${email}`);
      const checkData = await checkRes.json();

      const method = checkData.exists ? "PATCH" : "POST";
      const endpoint = checkData.exists ? "update-service" : "submit-service";

      // Kolla om tjänsten redan är vald
      if (checkData.exists && checkData.services.includes(translatedService)) {
        alert("Du har redan registrerat dig för denna tjänst.");
        return;
      }

      // Skicka in datan
      const saveRes = await fetch(`${BASE_URL}/api/${endpoint}`, {
        method,
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
      console.error("Fel vid fetch:", error);
      alert("Något gick fel. Försök igen senare.");
    }
  });
});
