document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM är laddat!");

    // Ladda header och footer med callback för att initiera login-popup
    loadHeaderAndFooter(() => {
        console.log("Header och footer laddade!");        
    });

        // Döljer "/pages/services.html" från URL-fältet om användaren är där
    // Clean URL-paths (visar /services istället för /pages/services.html)
    const path = window.location.pathname;

    if (path.endsWith('/index.html')) {
        history.replaceState({}, '', '/');
    } else if (path.endsWith('/pages/blog.html')) {
        history.replaceState({}, '', '/blog');
    } else if (path.endsWith('/pages/services.html')) {
        history.replaceState({}, '', '/services');
    } else if (path.endsWith('/pages/contact.html')) {
        history.replaceState({}, '', '/contact');
    } else if (path.endsWith('/pages/about.html')) {
        history.replaceState({}, '', '/about');
    } else if (path.endsWith('/auth/userLogin.html')) {
        history.replaceState({}, '', '/login');
    } else if (path.endsWith('/pages/regform.html')) {
        history.replaceState({}, '', '/member');
    }
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







