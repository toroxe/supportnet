import { renderAccordion } from './acc_render.js';

const BASE_URL = "https://my.supportnet.se/api/";
const analyticsUrl = `${BASE_URL}analytics`;

document.addEventListener("DOMContentLoaded", () => {
    console.log("newcookies.js loaded");

    // Kontrollera och logga analytics endast en gång
    if (!localStorage.getItem("analyticsLogged")) {
        logAnalytics("Cookie Analytics Page", "page_load");
        localStorage.setItem("analyticsLogged", "true");
    }

    // Hämta och rendera analytics data
    //fetchAnalytics();

    // Event listener för att rensa data
    const clearButton = document.querySelector("#raderar");
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (confirm("Är du säker på att du vill rensa all analytics-data?")) {
                clearAnalytics();
            }
        });
    }
});

// ---------------------------------------------
// Funktion: Logga analytics data
// ---------------------------------------------
function logAnalytics(page, action) {
    console.log(`logAnalytics körs för ${page}, ${action}`);
    const payload = {
        page_url: page,
        action_type: action,
        session_id: getSessionId() || "undefined",
        ip_address: "192.168.0.1" // Här lägger vi till en mockad IP om client-host ej finns
    };
    sendData(payload);
}

// ---------------------------------------------
// Funktion: Hämta och rendera analytics data
// ---------------------------------------------
async function fetchAnalytics() {
    try {
        const response = await fetch(analyticsUrl);
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Analytics-data är inte i rätt format.");
        }

        console.log("Hämtad data från servern:", data);

        // Rendera endast om data faktiskt finns
        if (data.length > 0) {
            renderAccordion(data);
        } else {
            console.warn("Inga analytics-data att rendera.");
        }
    } catch (error) {
        console.error("Misslyckades att hämta analytics-data:", error);
    }
}

// ---------------------------------------------
// Funktion: Rensa analytics data
// ---------------------------------------------
async function clearAnalytics() {
    try {
        const response = await fetch(analyticsUrl, {
            method: "DELETE",
        });

        if (response.ok) {
            alert("Analytics-data rensad.");
            fetchAnalytics(); // Uppdatera listan efter rensning
        } else {
            alert("Misslyckades att rensa analytics-data.");
        }
    } catch (error) {
        console.error("Fel vid rensning av analytics-data:", error);
    }
}

// ---------------------------------------------
// Funktion: Skicka data till servern
// ---------------------------------------------
function sendData(data) {
    fetch(analyticsUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then((response) => {
            if (response.ok) {
                console.log("Data skickad framgångsrikt");
            } else {
                console.error("Serverfel:", response.status);
            }
        })
        .catch((error) => {
            console.error("Misslyckades att skicka data:", error);
        });
}

// ---------------------------------------------
// Hjälp: Hämta session ID
// ---------------------------------------------
function getSessionId() {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
        const [key, value] = cookie.split("=");
        if (key === "session_cookie") {
            try {
                const cookieData = JSON.parse(value);
                return cookieData.session_id;
            } catch (error) {
                console.error("Misslyckades att tolka session_cookie:", error);
            }
        }
    }
    return null;
}