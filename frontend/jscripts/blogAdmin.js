const BASE_URL = "https://my.supportnet.se/api"; // Backend endpoint
let blogPosts = []; // Deklarera en global variabel för att lagra blogginlägg
let isEditing = false; // Flagga för redigering

// --------------------------------------
// Säkerställer att DOM är laddad innan rendering
// --------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    console.log("blogAdmin.js loaded");

    // Ladda blogginlägg och rendera i listan
    await fetchBlogPosts(); // Ladda blogginlägg först efter att DOM:en är redo

    // Event listener för att öppna modal för att skapa nytt blogginlägg
    const addBlogButton = document.querySelector("#create-blog");
    if (addBlogButton) {
        addBlogButton.addEventListener("click", () => openBlogModal());
    }

    // Event listener för att spara blogginlägg
    const saveBlogButton = document.querySelector("#save-blog");
    if (saveBlogButton) {
        saveBlogButton.addEventListener("click", saveBlogPost);
    }

    // Hantera bilduppladdning och förhandsvisning
    const imageInput = document.querySelector("#blog-image-upload");
    if (imageInput) {
        imageInput.addEventListener("change", handleImagePreview);
    }
});

// --------------------------------------
// Funktion: Förhandsvisa uppladdad bild
// --------------------------------------
function handleImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.querySelector("#image-preview");
            preview.innerHTML = `<img src="${e.target.result}" alt="Förhandsvisning" class="img-fluid rounded border" style="max-width: 100%; height: auto;" />`;
        };
        reader.readAsDataURL(file);
    } else {
        document.querySelector("#image-preview").innerHTML = "";
    }
}

// --------------------------------------
// Funktion: Hämta och rendera blogginlägg
// --------------------------------------
async function fetchBlogPosts() {
    try {
        const response = await fetch(`${BASE_URL}/blogposts`);
        const data = await response.json();

        // Logga resultatet för att inspektera det som hämtas
        console.log("Data från GET /blogposts:", data);

        blogPosts = data; // Spara inläggen i den globala variabeln

        const tableBody = document.querySelector("#blog-table-body");
        if (!tableBody) {
            throw new Error("Elementet med ID 'blog-table-body' saknas i DOM.");
        }

        tableBody.innerHTML = ""; // Rensa tabellen först
        blogPosts.forEach(post => {
            tableBody.innerHTML += `
                <tr>
                    <td>${post.id}</td>
                    <td>${post.title}</td>
                    <td>${post.likes}</td>
                    <td>${post.is_advertisement ? "Ja" : "Nej"}</td>
                    <td>
                        <img src="${post.image_url || 'Ingen bild'}" alt="Bild" style="width: 50px; height: auto;">
                        <button class="btn btn-warning" onclick="editBlogPost(${post.id})">Redigera</button>
                        <button class="btn btn-danger" onclick="deleteBlogPost(${post.id})">Radera</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Fel vid hämtning av blogginlägg:", error.message);
        alert("Misslyckades med att hämta blogginlägg. Kontrollera konsolen för mer information.");
    }
}

// --------------------------------------
// Funktion: Öppna modal för att skapa/redigera blogginlägg
// --------------------------------------
function openBlogModal(post = null) {
    const modalTitle = document.querySelector("#blog-modal-label");
    const blogIdInput = document.querySelector("#blogId");
    const titleInput = document.querySelector("#blog-title");
    const contentInput = document.querySelector("#blog-content");
    const likesInput = document.querySelector("#blog-likes");
    const contactLinkInput = document.querySelector("#blog-contact-link");
    const advertisementInput = document.querySelector("#blog-is-advertisement");
    const imageInput = document.querySelector("#blog-image-upload");
    const imagePreview = document.querySelector("#image-preview");

    if (post) {
        // Om vi redigerar ett blogginlägg
        modalTitle.textContent = "Redigera Blogginlägg";
        blogIdInput.value = post.id;
        titleInput.value = post.title;
        contentInput.value = post.content;
        likesInput.value = post.likes;
        contactLinkInput.value = post.contact_link;
        advertisementInput.checked = post.is_advertisement;

        // Rendera bilden om `image_url` finns
        if (post.image_url) {
            imagePreview.innerHTML = `<img src="${post.image_url}" alt="Förhandsvisning" class="img-fluid rounded border" style="max-width: 100%; height: auto;" />`;
        } else {
            imagePreview.innerHTML = "Ingen bild tillgänglig";
        }
    } else {
        // Om vi skapar ett nytt blogginlägg
        modalTitle.textContent = "Nytt Blogginlägg";
        blogIdInput.value = "";
        titleInput.value = "";
        contentInput.value = "";
        likesInput.value = 0;
        contactLinkInput.value = "";
        advertisementInput.checked = false;
        imageInput.value = null;
        imagePreview.innerHTML = "";
    }

    const blogModal = new bootstrap.Modal(document.querySelector("#blog-modal"));
    blogModal.show();
}

// --------------------------------------
// Funktion: Spara blogginlägg (med stöd för image_url)
// --------------------------------------
async function saveBlogPost() {
    const blogId = isEditing ? document.querySelector("#blogId").value : null;
    const title = document.querySelector("#blog-title").value;
    const content = document.querySelector("#blog-content").value;
    const likes = parseInt(document.querySelector("#blog-likes").value) || 0;
    const contactLink = document.querySelector("#blog-contact-link").value || "";
    const isAdvertisement = document.querySelector("#blog-is-advertisement").checked;
    const imageFile = document.querySelector("#blog-image-upload").files[0];

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("likes", likes);
    formData.append("contact_link", contactLink);
    formData.append("is_advertisement", isAdvertisement);
    if (imageFile) {
        formData.append("image", imageFile);
    }

    const contractName = document.querySelector("#blog-contract").value || ""; // Hämta valt kontraktsnamn
    formData.append("contract_name", contractName); // Lägg till i formdatan

    const url = isEditing ? `${BASE_URL}/blogposts/${blogId}` : `${BASE_URL}/blogposts`;
    const method = isEditing ? "PUT" : "POST";

    try {
        const response = await fetch(url, { method, body: formData });
        if (!response.ok) {
            throw new Error(await response.text());
        }

        alert(isEditing ? "Blogginlägg uppdaterades!" : "Blogginlägg skapades!");
        isEditing = false; // Återställ flaggan efter sparande
        fetchBlogPosts();
    } catch (error) {
        console.error("Fel vid spara:", error);
        alert("Misslyckades med att spara blogginlägget.");
    }
}

//---------------------------------------------------------------------
// Öppnar redigeringsformuläret med existerande data
//---------------------------------------------------------------------
function editBlogPost(postId) {
    const post = blogPosts.find(p => p.id === postId);
    if (!post) {
        alert("Blogginlägg kunde inte hittas.");
        return;
    }

    isEditing = true; // Sätt flaggan till redigering

    document.querySelector("#blogId").value = post.id;
    document.querySelector("#blog-title").value = post.title;
    document.querySelector("#blog-content").value = post.content;
    document.querySelector("#blog-likes").value = post.likes;
    document.querySelector("#blog-contact-link").value = post.contact_link;
    document.querySelector("#blog-is-advertisement").checked = post.is_advertisement;

    const imagePreview = document.querySelector("#image-preview");
    if (post.image_url) {
        imagePreview.innerHTML = `
            <img src="${post.image_url}" alt="Förhandsvisning" 
                 class="img-fluid rounded border" 
                 style="max-width: 100%; height: auto;" />
        `;
    } else {
        imagePreview.innerHTML = "Ingen bild tillgänglig";
    }

    const modal = new bootstrap.Modal(document.querySelector("#blog-modal"));
    modal.show();
}

// --------------------------------------
// Funktion: Uppdatera blogginlägg (med stöd för image_url)
// --------------------------------------
async function updateBlogPost(postId) {
    const title = document.querySelector("#blog-title").value;
    const content = document.querySelector("#blog-content").value;
    const likes = parseInt(document.querySelector("#blog-likes").value) || 0;
    const contactLink = document.querySelector("#blog-contact-link").value || ""; // Säkerställ att detta inte är null
    const isAdvertisement = document.querySelector("#blog-is-advertisement").checked;
    const imageFile = document.querySelector("#blog-image-upload").files[0];

    try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        formData.append("likes", likes);
        formData.append("contact_link", contactLink); // Se till att det inte är null
        formData.append("is_advertisement", isAdvertisement);
        if (imageFile) {
            formData.append("image", imageFile);
        }

        const response = await fetch(`${BASE_URL}/blogposts/${postId}`, {
            method: "PUT",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Misslyckades med att uppdatera blogginlägget: ${response.statusText}`);
        }

        alert("Blogginlägget har uppdaterats!");
        fetchBlogPosts(); // Uppdatera listan
    } catch (error) {
        console.error("Fel vid uppdatering:", error.message);
        alert("Misslyckades med att uppdatera blogginlägget.");
    }
}

// ---------------------------------------------------------------
// Raderar blogg post
//---------------------------------------------------------------
async function deleteBlogPost(postId) {
    if (!confirm("Är du säker på att du vill radera detta blogginlägg?")) {
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/blogposts/${postId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`Kunde inte radera blogginlägg: ${response.statusText}`);
        }

        alert("Blogginlägget har raderats!");
        fetchBlogPosts(); // Ladda om tabellen
    } catch (error) {
        console.error("Fel vid radering:", error.message);
        alert("Misslyckades med att radera blogginlägget.");
    }
}

// --------------------------------------------------------------
// Packar kontraktstabellen til dropdown
// --------------------------------------------------------------
async function fetchContracts() {
    try {
        // Skicka GET-request till rätt API för kontrakt
        const response = await fetch(`${BASE_URL}/contracts`);
        if (!response.ok) {
            throw new Error("Misslyckades med att hämta företag.");
        }

        const contracts = await response.json(); // Förvänta att API returnerar en lista
        const contractDropdown = document.querySelector("#blog-contract");

        // Fyll dropdown med företagsnamn
        contracts.forEach(contract => {
            const option = document.createElement("option");
            option.value = contract.company_name; // Använd företagsnamn som värde
            option.textContent = contract.company_name; // Visa företagsnamn
            contractDropdown.appendChild(option);
        });
    } catch (error) {
        console.error("Fel vid hämtning av företag:", error);
        alert("Kunde inte ladda företag för dropdown.");
    }
}

// Kör funktionen för att fylla dropdown vid sidladdning
fetchContracts();





