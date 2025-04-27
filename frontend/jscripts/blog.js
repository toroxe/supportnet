import { ENDPOINTS } from "../myconfig.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Hämta alla blogginlägg från API
        const response = await fetch(ENDPOINTS.blogList); 
        if (!response.ok) throw new Error("Misslyckades med att hämta data.");
        const blogPosts = await response.json();

        // Separera blogginlägg och annonser
        const posts = blogPosts.filter((post) => !post.is_advertisement);
        const ads = blogPosts.filter((post) => post.is_advertisement);

        // Rendera tabellen
        renderTable(posts, ads);
    } catch (error) {
        console.error("Ett fel uppstod vid renderingen:", error);
    }
});

// Funktion för att rendera tabellen
function renderTable(posts, ads) {
    const contentBody = document.querySelector("#content-body");
    const maxLength = Math.max(posts.length, ads.length);
    let rows = "";

    for (let i = 0; i < maxLength; i++) {
        const post = posts[i] || null;
        const ad = ads[i] || null;

        rows += `
            <tr>
                <td style="width: 70%;">${post ? renderBlogPost(post) : ""}</td>
                <td style="width: 30%;${ad ? renderAd(ad) : ""}</td>
            </tr>
        `;
    }

    contentBody.innerHTML = rows;
}

// Funktion för att rendera blogginlägg
function renderBlogPost(post) {
    return `
        <div class="card mb-4">
            <div class="row g-0">
                <div class="col-md-4">
                    <img src="${post.image_url}" class="img-fluid rounded-start" alt="Blogginlägg: ${post.title} – från MySupportNet">
                </div>
                <div class="col-md-8">
                    <div class="card-body">
                        <h5 class="card-title text-center">${post.title}</h5>
                        <p class="card-text">${post.blogText}</p>
                        <button class="btn btn-primary like-btn" data-id="${post.id}" ${post.liked ? "disabled" : ""}>
                            <i class="bi bi-hand-thumbs-up"></i> Gilla (${post.likes})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Funktion för att rendera annonser
function renderAd(ad) {
    return `
        <div class="card mb-4">
            <img src="${ad.image_url}" class="card-img-top" alt="Blogginlägg: ${ad.title} – från MySupportNet">
            <div class="card-body">
                <h5 class="card-title">${ad.title}</h5>
                <p class="card-text">${ad.blogText}</p>
                <a href="${ad.contact_link}" class="btn btn-warning" target="_blank">Kontakta</a>
            </div>
        </div>
    `;
}

// Lyssna på like-knappens klickhändelse
document.addEventListener("click", async (event) => {
    const button = event.target.closest(".like-btn");
    if (button) {
        const postId = button.getAttribute("data-id");
        try {
            // Skicka like till servern
            const response = await fetch(ENDPOINTS.likePost(postId), { method: "POST" });
            if (!response.ok) throw new Error("Misslyckades med att uppdatera like.");
            const data = await response.json();

            // Uppdatera knappen och disabla den
            button.innerHTML = `<i class="bi bi-hand-thumbs-up"></i> Gilla (${data.likes})`;
            button.disabled = true;
        } catch (error) {
            console.error("Kunde inte uppdatera like:", error);
        }
    }
});

// -------------------------------------------------------------------------
// Renderar poster på liten skärm
// -------------------------------------------------------------------------
function renderMobileView(posts, ads) {
    const blogSection = document.querySelector("#mobile-blog-posts");
    const adSection = document.querySelector("#mobile-ads");

    // Töm tidigare innehåll
    blogSection.innerHTML = "";
    adSection.innerHTML = "";

    // Rendera blogginlägg
    posts.forEach((post) => {
        const blogCard = `
            <div class="card blog-post">
                <img src="${post.image_url}" alt="${post.title}" class="card-img-top">
                <div class="card-body">
                    <h5 class="card-title">${post.title}</h5>
                    <p class="card-content">${post.blogText}</p>
                    <button class="btn btn-primary like-btn" data-id="${post.id}" ${post.liked ? "disabled" : ""}>
                        <i class="bi bi-hand-thumbs-up"></i> Gilla (${post.likes})
                    </button>
                </div>
            </div>
        `;
        blogSection.innerHTML += blogCard;
    });

    // Rendera annonser
    ads.forEach((ad) => {
        const adCard = `
            <div class="card ad-item">
                <img src="${ad.image_url}" alt="${ad.title}" class="card-img-top">
                <div class="card-body">
                    <h5 class="card-title">${ad.title}</h5>
                    <p class="card-content">${ad.blogText}</p>
                    <a href="${ad.contact_link}" class="btn btn-warning" target="_blank">Kontakta</a>
                </div>
            </div>
        `;
        adSection.innerHTML += adCard;
    });
}

//----------------------------------------------------------------------
// Samband binder till liten skärm
// ---------------------------------------------------------------------
// Kontrollera om elementet finns innan du använder det
function renderContent(posts, ads) {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    const desktopLayout = document.querySelector("#desktop-layout");
    const mobileLayout = document.querySelector("#mobile-layout");

    if (desktopLayout && mobileLayout) {
        if (isMobile) {
            desktopLayout.style.display = "none";
            mobileLayout.style.display = "block";
            renderMobileView(posts, ads);
        } else {
            desktopLayout.style.display = "table";
            mobileLayout.style.display = "none";
            renderTable(posts, ads);
        }
    } else {
        console.error("Element saknas i DOM: #desktop-layout eller #mobile-layout");
    }
}

// Lyssna på DOMContentLoaded och skärmstorlek
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch(ENDPOINTS.blogList);
        if (!response.ok) throw new Error("Misslyckades med att hämta blogginlägg.");
        const blogPosts = await response.json();

        const posts = blogPosts.filter(post => !post.is_advertisement);
        const ads = blogPosts.filter(post => post.is_advertisement);

        renderContent(posts, ads);
        window.addEventListener("resize", () => renderContent(posts, ads));
    } catch (error) {
        console.error("Fel vid hämtning av blogginlägg och annonser:", error);
    }
});




