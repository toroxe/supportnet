import { BASE_URL, ENDPOINTS } from "../myconfig.js"; // Backend endpoint
let blogPosts = []; // Deklarera en global variabel för att lagra blogginlägg
let isEditing = false; // Flagga för redigering
let quill;

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

        quill = new Quill("#blog-text-editor", {
        theme: "snow",
        placeholder: "Skriv innehåll här...",
    });

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
        const response = await fetch(ENDPOINTS.blogList);
        const data = await response.json();

        console.log("Data från GET /blogposts:", data);

        blogPosts = data;

        const tableBody = document.querySelector("#blog-table-body");
        if (!tableBody) {
            throw new Error("Elementet med ID 'blog-table-body' saknas i DOM.");
        }

        tableBody.innerHTML = "";

        blogPosts.forEach(post => {
            tableBody.innerHTML += `
                <tr>
                    <td>${post.id}</td>
                    <td>${post.company_name || "-"}</td>
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
    const textInput = document.querySelector("#blog-text");
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
        textInput.value = post.blogText;
        likesInput.value = post.likes;
        contactLinkInput.value = post.contact_link;
        advertisementInput.checked = post.is_advertisement;

        loadContractDropdown(post.company_name);
        document.querySelector("#blog-contract").value = post.company_name || "";


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
        textInput.value = "";
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
// 📝 Se till att Quill-editorns innehåll hamnar i input-fältet
    const blogTextInput = document.querySelector("#blog-text");
    if (quill && blogTextInput) {
        blogTextInput.value = quill.root.innerHTML;
    }   

    const title = document.querySelector("#blog-title").value;
    const blogText = document.querySelector("#blog-text").value;
    const likes = parseInt(document.querySelector("#blog-likes").value) || 0;
    const contactLink = document.querySelector("#blog-contact-link").value || "";
    const isAdvertisement = document.querySelector("#blog-is-advertisement").checked;
    const imageFile = document.querySelector("#blog-image-upload").files[0];
    const companyName = document.querySelector("#blog-contract").value;

    if (!companyName || companyName === "") {
        alert("Du måste välja ett giltigt kontrakt.");
        return;
    }

    try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("blogText", blogText);
        formData.append("likes", likes);
        formData.append("contact_link", contactLink);
        formData.append("is_advertisement", isAdvertisement);
        formData.append("company_name", companyName); // 🟢 Nyckeln som backend förväntar sig

        if (imageFile) {
            formData.append("image", imageFile);
        }

        const response = await fetch(ENDPOINTS.blogList, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        alert("Blogginlägg skapades!");
        bootstrap.Modal.getInstance(document.querySelector("#blog-modal")).hide();
        fetchBlogPosts(); // 🔁 Ladda om gridden
    } catch (error) {
        console.error("Fel vid spara:", error.message);
        alert("Misslyckades med att spara blogginlägget.");
    }
}

//---------------------------------------------------------------------
// Öppnar redigeringsformuläret med existerande data
//---------------------------------------------------------------------
async function editBlogPost(postId) {
    const post = blogPosts.find(p => p.id === postId);
    if (!post) {
        alert("Blogginlägg kunde inte hittas.");
        return;
    }

    isEditing = true;
    document.querySelector("#blogId").value = post.id;
    document.querySelector("#blog-title").value = post.title;
    document.querySelector("#blog-text").value = post.blogText;
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

    // 🟢 Ladda kontrakt och sätt valt
    await loadContractDropdown(post.company_name);

    const modal = new bootstrap.Modal(document.querySelector("#blog-modal"));
    modal.show();
}

// --------------------------------------
// Funktion: Uppdatera blogginlägg (med stöd för image_url)
// --------------------------------------
async function updateBlogPost(postId) {
    const title = document.querySelector("#blog-title").value;
    const blogText = document.querySelector("#blog-text").value;
    const likes = parseInt(document.querySelector("#blog-likes").value) || 0;
    const contactLink = document.querySelector("#blog-contact-link").value || "";
    const isAdvertisement = document.querySelector("#blog-is-advertisement").checked;
    const imageFile = document.querySelector("#blog-image-upload").files[0];
    const companyName = document.querySelector("#blog-contract").value;

    if (!companyName || companyName === "") {
        alert("Du måste välja ett giltigt kontrakt.");
        return;
    }

    try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("blogText", blogText);
        formData.append("likes", likes);
        formData.append("contact_link", contactLink);
        formData.append("is_advertisement", isAdvertisement);
        formData.append("company_name", companyName); // 🟢 Rätt namn skickas med

        if (imageFile) {
            formData.append("image", imageFile);
        }

        const response = await fetch(`${ENDPOINTS.blogList}/${postId}`, {
            method: "PUT",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        alert("Blogginlägget har uppdaterats!");
        const modal = bootstrap.Modal.getInstance(document.querySelector("#blog-modal"));
        modal.hide();
        fetchBlogPosts(); // 🔁 Uppdatera listan
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
        const response = await fetch(`${ENDPOINTS.blogList}/${postId}`, {
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

async function loadContractDropdown(selectedName = "") {
    const select = document.querySelector("#blog-contract");
    if (!select) return;

    select.innerHTML = `<option value="">Ingen</option>`;  // Reset

    try {
        const res = await fetch("/api/contracts");
        if (!res.ok) throw new Error("Fel vid hämtning av kontrakt");
        const data = await res.json();

        data.forEach(contract => {
            const option = document.createElement("option");
            option.value = contract.company_name;
            option.textContent = contract.company_name;           

            if (contract.company_name === selectedName) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    } catch (err) {
        console.error("Misslyckades hämta kontrakt:", err);
    }
}

const saveBlogButton = document.querySelector("#save-blog");
if (saveBlogButton) {
    saveBlogButton.addEventListener("click", () => {
        const blogId = document.querySelector("#blogId").value;
        if (blogId) {
            updateBlogPost(blogId);
        } else {
            saveBlogPost();
        }
    });
}

// Kör funktionen för att fylla dropdown vid sidladdning
loadContractDropdown();

window.editBlogPost = editBlogPost;
window.deleteBlogPost = deleteBlogPost;






