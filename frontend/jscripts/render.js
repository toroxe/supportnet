document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM är laddat!");

    // Ladda header och footer med callback för att initiera login-popup
    loadHeaderAndFooter(() => {
        console.log("Header och footer laddade!");        
    });
});

/** Funktion för att ladda header och footer **/
function loadHeaderAndFooter(callback) {
    fetch('../pages/header.html')
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load header");
            }
            return response.text();
        })
        .then(data => {
            const headerPlaceholder = document.getElementById('header-placeholder');
            if (headerPlaceholder) {
                headerPlaceholder.innerHTML = data;
            }
            if (callback) callback(); // Kör callback efter header är laddad
        })
        .catch(error => console.error('Error loading header:', error));

    fetch('../pages/footer.html')
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load footer");
            }
            return response.text();
        })
        .then(data => {
            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                footerPlaceholder.innerHTML = data;
            }
        })
        .catch(error => console.error('Error loading footer:', error));
}




