import { ENDPOINTS } from "/js/myconfig.js";

const statusElement = document.querySelector("#blog-status");
const blogPostsElement = document.querySelector("#blog-posts");
const partnerPostsElement = document.querySelector("#partner-posts");

function setStatus(message = "", isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("is-error", isError);
}

function asSafeUrl(value) {
    if (!value) return null;

    try {
        const url = new URL(value, window.location.origin);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

function createImage(urlValue, altText, mediaClass) {
    const source = asSafeUrl(urlValue);
    if (!source) return null;

    const media = document.createElement("div");
    media.className = mediaClass;

    const image = document.createElement("img");
    image.src = source;
    image.alt = altText;
    image.loading = "lazy";
    image.decoding = "async";
    media.append(image);

    return media;
}

function createBlogCard(post) {
    const card = document.createElement("article");
    card.className = "blog-card";

    const title = String(post.title || "Blogginlägg");
    const media = createImage(post.image_url, `Bild till ${title}`, "blog-card-media");
    if (media) {
        card.classList.add("has-image");
        card.append(media);
    }

    const body = document.createElement("div");
    body.className = "blog-card-body";

    const heading = document.createElement("h3");
    heading.className = "blog-card-title";
    heading.textContent = title;

    const text = document.createElement("p");
    text.className = "blog-card-text";
    text.textContent = String(post.blogText || "");

    const likes = Number.isFinite(Number(post.likes)) ? Number(post.likes) : 0;
    const likeButton = document.createElement("button");
    likeButton.type = "button";
    likeButton.className = "like-button";
    likeButton.dataset.postId = String(post.id);
    likeButton.dataset.likes = String(likes);
    likeButton.disabled = Boolean(post.liked);
    likeButton.textContent = `Gilla (${likes})`;

    body.append(heading, text, likeButton);
    card.append(body);
    return card;
}

function createPartnerCard(partner) {
    const card = document.createElement("article");
    card.className = "partner-card";

    const title = String(partner.title || partner.company_name || "Partner");
    const media = createImage(partner.image_url, `Bild till ${title}`, "partner-card-media");
    if (media) card.append(media);

    const body = document.createElement("div");
    body.className = "partner-card-body";

    const heading = document.createElement("h3");
    heading.className = "partner-card-title";
    heading.textContent = title;

    const text = document.createElement("p");
    text.className = "partner-card-text";
    text.textContent = String(partner.blogText || "");

    body.append(heading, text);

    const contactUrl = asSafeUrl(partner.contact_link);
    if (contactUrl) {
        const link = document.createElement("a");
        link.className = "partner-contact-link";
        link.href = contactUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Kontakta";
        body.append(link);
    }

    card.append(body);
    return card;
}

function renderList(container, items, createCard, emptyMessage) {
    container.replaceChildren();

    if (!items.length) {
        const emptyState = document.createElement("p");
        emptyState.className = "empty-state";
        emptyState.textContent = emptyMessage;
        container.append(emptyState);
        return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.append(createCard(item)));
    container.append(fragment);
}

async function loadBlogContent() {
    setStatus("Laddar innehåll...");

    try {
        const response = await fetch(ENDPOINTS.blogList, {
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error("Oväntat svar från servern");
        }

        const posts = data.filter((item) => !item.is_advertisement);
        const partners = data.filter((item) => item.is_advertisement);

        renderList(blogPostsElement, posts, createBlogCard, "Inga blogginlägg är publicerade ännu.");
        renderList(partnerPostsElement, partners, createPartnerCard, "Inga partners visas just nu.");
        setStatus();
    } catch (error) {
        console.error("Kunde inte hämta bloggen:", error);
        renderList(blogPostsElement, [], createBlogCard, "Blogginläggen kunde inte hämtas.");
        renderList(partnerPostsElement, [], createPartnerCard, "Partnerinformationen kunde inte hämtas.");
        setStatus("Bloggen kunde inte hämtas. Försök igen om en stund.", true);
    }
}

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".like-button");
    if (!button || button.disabled) return;

    const previousLikes = Number(button.dataset.likes || 0);
    button.disabled = true;
    button.textContent = "Uppdaterar...";

    try {
        const response = await fetch(ENDPOINTS.likePost(button.dataset.postId), {
            method: "POST",
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const updatedPost = await response.json();
        const likes = Number.isFinite(Number(updatedPost.likes))
            ? Number(updatedPost.likes)
            : previousLikes + 1;
        button.dataset.likes = String(likes);
        button.textContent = `Gillad (${likes})`;
    } catch (error) {
        console.error("Kunde inte registrera gillningen:", error);
        button.disabled = false;
        button.textContent = `Gilla (${previousLikes})`;
        setStatus("Din gillning kunde inte registreras. Försök igen.", true);
    }
});

loadBlogContent();
