document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM är laddat: Från cook.js");

    initCookieModal();
});

/** Funktion för att hantera cookie-modal **/
function initCookieModal() {
    console.log("Initierar cookie-hantering.");

    // Hämta modalen och accept-knappen
    const cookieModal = document.querySelector("[name='cookieModal']");
    const acceptCookieButton = document.querySelector("#custom-cookie-btn");

    if (!cookieModal) {
        console.error("Cookie-modal saknas i DOM!");
        return;
    }
    if (!acceptCookieButton) {
        console.error("Accept-knappen saknas i DOM!");
        return;
    }

    console.log("Knappen hittad:", acceptCookieButton);

    // Eventlyssnare för acceptknappen
    acceptCookieButton.addEventListener("click", () => {
        console.log("Accept-knappen klickad!");
        document.cookie = "cookiesAccepted=true; path=/; max-age=" + 60 * 60 * 24 * 365;
        hideModal(cookieModal);
    });

    // Kontrollera cookies och visa modal om nödvändigt
    if (!isCookieAccepted()) {
        console.log("Visar cookie-modal eftersom cookies ej accepterats.");
        showModal(cookieModal);
    } else {
        console.log("Cookies redan accepterade.");
        hideModal(cookieModal); // Döljer modalen direkt om cookies redan accepterats
    }
}

/** Kontrollera om cookies redan är accepterade **/
function isCookieAccepted() {
    return document.cookie.includes("cookiesAccepted=true");
}

/** Visa modalen **/
function showModal(modal) {
    modal.style.display = "block";
    modal.classList.add("show");
    console.log("Cookie-modal visas.");
}

/** Dölj modalen **/
function hideModal(modal) {
    modal.style.display = "none";
    modal.classList.remove("show");
    console.log("Cookie-modal dold.");
}








