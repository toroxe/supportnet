const cookieName = "cookiesAccepted";
const cookieLifetimeSeconds = 60 * 60 * 24 * 365;

function readCookie(name) {
    const prefix = `${encodeURIComponent(name)}=`;
    const cookie = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));

    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function writeAcceptanceCookie() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${encodeURIComponent(cookieName)}=true; Path=/; Max-Age=${cookieLifetimeSeconds}; SameSite=Lax${secure}`;
}

function showModal(modal, acceptButton) {
    modal.hidden = false;
    modal.style.display = modal.classList.contains("cookie-consent") ? "grid" : "block";
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    acceptButton.focus({ preventScroll: true });
}

function hideModal(modal) {
    modal.classList.remove("show");
    modal.style.display = "none";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
}

function initCookieModal() {
    const cookieModal = document.querySelector("[name='cookieModal']");
    const acceptCookieButton = document.querySelector("#custom-cookie-btn");

    if (!cookieModal || !acceptCookieButton) return;

    if (readCookie(cookieName) === "true") {
        hideModal(cookieModal);
        return;
    }

    acceptCookieButton.addEventListener("click", () => {
        writeAcceptanceCookie();
        hideModal(cookieModal);
        window.dispatchEvent(new CustomEvent("cookies:accepted"));
    }, { once: true });

    showModal(cookieModal, acceptCookieButton);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCookieModal, { once: true });
} else {
    initCookieModal();
}
