import { renderAccordion } from './acc_render.js';

const BASE_URL = "https://my.supportnet.se/api/";
const analyticsUrl = `${BASE_URL}analytics`;

let sessionStartTime = Date.now(); // Spara starttid för sessionen

document.addEventListener("DOMContentLoaded", () => {
    console.log("newcookies.js loaded");

    // Hantera session-cookie
    handleSessionCookie();

    // Logga första sidbesöket
    logAnalytics("Cookie Analytics Page", "page_load");

    // Event listener för att rensa data
    const clearButton = document.querySelector("#raderar");
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (confirm("Är du säker på att du vill rensa all analytics-data?")) {
                clearAnalytics();
            }
        });
    }

    // Lägg till i DOMContentLoaded:
const testButton = document.querySelector("#test-log-button");
if (testButton) {
    testButton.addEventListener("click", () => {
        sendTestLog();
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
        session_duration: calculateSessionDuration(), // NYTT!
    };
    sendData(payload);
}

// ---------------------------------------------
// Funktion: Räkna ut hur lång sessionen är
// ---------------------------------------------
function calculateSessionDuration() {
    const now = Date.now();
    const durationInSeconds = Math.floor((now - sessionStartTime) / 1000);
    return durationInSeconds;
}

// ---------------------------------------------
// Funktion: Generera ett nytt unikt session-ID
// ---------------------------------------------
function generateSessionId() {
    return 'xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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

//----------------------------------------------
// Hantera sessions cookien
//---------------------------------------------
function handleSessionCookie() {
    const sessionCookie = getSessionId();
    if (!sessionCookie) {
        const newSessionId = generateSessionId();
        const cookieData = { session_id: newSessionId, start_time: Date.now() }; // Starttid i cookien
        document.cookie = `session_cookie=${JSON.stringify(cookieData)}; path=/; max-age=300`; // 5 minuter
        console.log("Ny session-cookie skapad:", cookieData.session_id);
    }
}

// ---------------------------------------------
// Funktion: Hämta session-ID från cookie
// ---------------------------------------------
function getSessionId() {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
        const [key, value] = cookie.split("=");
        if (key === "session_cookie") {
            try {
                const cookieData = JSON.parse(value);
                if (!cookieData.start_time) {
                    cookieData.start_time = Date.now(); // Säkerställ start_time finns
                    document.cookie = `session_cookie=${JSON.stringify(cookieData)}; path=/; max-age=300`;
                }
                sessionStartTime = cookieData.start_time; // NU SÄTTER VI rätt starttid
                return cookieData.session_id;
            } catch (error) {
                console.error("Misslyckades att tolka session_cookie:", error);
            }
        }
    }
    return null;
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
            localStorage.removeItem("analyticsLogged"); // Ta bort loggmarkering
            document.cookie = "session_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; // Radera session-cookie
            window.location.reload(); // Starta om allt snyggt!
        } else {
            alert("Misslyckades att rensa analytics-data.");
        }
    } catch (error) {
        console.error("Fel vid rensning av analytics-data:", error);
    }
}

//---------------------------------------------
// Test av funktionalitet
//---------------------------------------------

function sendTestLog() {
    const payload = {
        page_url: "TestPage",
        action_type: "test_log",
        session_id: getSessionId() || "undefined",
        session_duration: calculateSessionDuration(),
        ip_address: "8.8.8.8" // FAKTISK IP FÖR TEST (exempel: Google DNS-adress)
    };
    sendData(payload);
    alert("Testlogg skickad!");
}

