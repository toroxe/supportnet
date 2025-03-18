// 🌍 Globala variabler
const BASE_URL = "https://my.supportnet.se";

let recognition; // Röstigenkänning
let isRecording = false; // Status för inspelning
let collectedText = ""; // Samlar all text
let draggedItem = null;
let lastTranscript = ""; // Håller koll på senaste transkriberingen
let textArea = document.getElementById("postItText");
let stopTimeout; 
let transcriptSet = new Set();  // 🟢 Lagra unika transkriberingar

/// ----------------------------------------------------------------
// 📌 Sidladdning – Startar när DOM är redo
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 DOMContentLoaded – laddar post-its och konfigurerar inspelning...");

    // 🔹 Hämta användardata
    let userData = JSON.parse(sessionStorage.getItem("userData"));
    let contractId = sessionStorage.getItem("contract_id");

    if (!contractId && userData && userData.contract) {
        sessionStorage.setItem("contract_id", userData.contract);
        console.log("🔄 Återställde contract_id i sessionStorage:", userData.contract);
    }

    if (!contractId) {
        console.error("⛔ Ingen contract_id tillgänglig! Något gick fel.");
    }

    console.log("✅ Användardata:", userData);
    console.log("✅ Contract ID:", sessionStorage.getItem("contract_id"));

    // 🔹 Ladda Post-Its
    loadPostIts();
    
    // 🔹 Hämta element
    const postItText = document.getElementById("postItText");
    const modal = new bootstrap.Modal(document.getElementById("postItModal"));

    // 🟢 Initiera röstinspelning
    initializeSpeechRecognition();

    // 🟢 Hantera modalfönster
    document.getElementById("openPostItModal").addEventListener("click", () => {
        postItText.value = ""; // Rensa textfältet vid öppning
        modal.show();
    });

    document.getElementById("savePostIt").addEventListener("click", () => {
        const text = postItText.value.trim();
        if (text) {
            const newPostIt = savePostItToDB(text);
            addDragAndDropToPostIt(newPostIt);  // 🟢 Lägg till drag & drop för nya post-it
            modal.hide();
        }
    });   

    // 🎤 🟢 Koppla knapparna korrekt till röstinspelning
    document.getElementById("startRecording").addEventListener("click", startSpeechRecognition);
    document.getElementById("stopRecording").addEventListener("click", stopSpeechRecognition);

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.classList && node.classList.contains("post-it")) {
                    console.log("📌 Ny Post-It upptäckt, initierar drag & drop...");
                    setTimeout(() => addDragAndDropToPostIt(node), 100); // Säkerställ att den finns i DOM
                }
            });
        });
    });
    
    observer.observe(document.getElementById("postItContainer"), { childList: true });

    // 🟢 Ladda headern dynamiskt
    try {
        const response = await fetch("../userpages/userHeader.html");
        const headerHTML = await response.text();
        document.getElementById("header-placeholder").innerHTML = headerHTML;

        if (userData && userData.c_name) {
            document.getElementById("dashboardUser").textContent = `Välkommen, ${userData.c_name}!`;
        }

        // 🟢 Lägg till utloggningsfunktion
        document.getElementById("logoutButton").addEventListener("click", function () {
            console.log("👋 Användaren loggar ut...");
            sessionStorage.clear();
            window.location.href = "userDashboard.html"; // Skickar användaren till dashboarden
        });
    } catch (error) {
        console.error("❌ Kunde inte ladda post-it header:", error);
    }

    console.log("✅ Header laddad!");
});

// ----------------------------------------------------------------
// 🎯 Drag and Drop funktion för Post-Its
// ----------------------------------------------------------------
function initializeDragAndDrop() {
    const container = document.getElementById("postItContainer");
    if (!container) return;

    const postIts = container.querySelectorAll(".post-it");

    if (postIts.length === 0) {
        console.warn("⚠️ Inga Post-It lappar hittades!");
        return;
    }

    console.log("✅ Post-It lappar hittades! Initierar drag & drop...");

    let draggedItem = null;

    postIts.forEach(postIt => addDragAndDropToPostIt(postIt));

    container.addEventListener("dragover", function (e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
    
        if (draggedItem) {
            if (!afterElement) {
                container.appendChild(draggedItem); // Om inget element hittas, lägg den sist
            } else if (afterElement instanceof Element) { // Kontrollera att det är en riktig DOM-nod
                container.insertBefore(draggedItem, afterElement);
            } else {
                console.warn("⚠️ Ogiltig afterElement i drag & drop", afterElement);
            }
        }
    });
   
   

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".post-it:not(.dragging)")];
    
        let closestElement = null;
        let closestOffset = Number.NEGATIVE_INFINITY;
    
        draggableElements.forEach(child => {
            const box = child.getBoundingClientRect();
            const offset = y - (box.top + box.height / 2);
    
            if (offset < 0 && offset > closestOffset) {
                closestOffset = offset;
                closestElement = child;
            }
        });
    
        return closestElement; // Returnera en riktig DOM-nod eller null
    }
    
}

// -----------------------------------------------------------
// 🎤 Röstinspelning – motor (Fixar kontinuerlig rendering och korrekt concatenation)
// -----------------------------------------------------------

function initializeSpeechRecognition() {
    console.log("🎤 Röstigenkänning initieras...");

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;  // 🟢 Ger löpande uppdatering
    recognition.lang = "sv-SE";

    recognition.onresult = function (event) {
        let transcript = event.results[event.results.length - 1][0].transcript.trim();
    
        // 🔹 Dela upp texten i ord för mer exakt jämförelse
        let words = transcript.split(" ");
    
        // 🟢 Filtrera bort dubbletter – endast nya ord läggs till
        let newWords = words.filter(word => !transcriptSet.has(word));
    
        if (newWords.length === 0) {
            console.warn("⚠️ Ingen ny text, ignorerar.");
            return;
        }
    
        // 🔹 Lägg till nya ord i Set och uppdatera textArea
        newWords.forEach(word => transcriptSet.add(word));
        textArea.value += " " + newWords.join(" ");
    };

    recognition.onspeechstart = function () {
        console.log("🎤 Röstupptäckt – inspelning pågår...");
        clearTimeout(stopTimeout); // 🟢 Nollställ timeout vid ny röst
    };

    recognition.onspeechend = function () {
        console.log("🛑 Ingen röst upptäckt, startar timeout...");
        
        if (stopTimeout) clearTimeout(stopTimeout); // 🟢 Förhindrar flera timeouts

        stopTimeout = setTimeout(() => {
            recognition.stop();
            isRecording = false;
            console.log("🛑 Ingen röst upptäckt på 5 sekunder, inspelning stoppad.");
        }, 5000);
    };

    // 🟢 Manuell styrning via knappar
    window.startSpeechRecognition = function () {
        if (!isRecording) {
            recognition.start();
            isRecording = true;
            console.log("🎤 Inspelning startad...");
        } else {
            console.warn("⚠️ Inspelning pågår redan, startar inte om.");
        }
    };

    window.stopSpeechRecognition = function () {
        if (isRecording) {
            recognition.stop();
            isRecording = false;
            clearTimeout(stopTimeout);
            console.log("🛑 Inspelning stoppad.");
        }
    };
}

// ----------------------------------------------------------------
// 💾 Spara Post-It till databasen
// ----------------------------------------------------------------
function savePostItToDB(text) {
    console.log("🔹 savePostItToDB anropad");

    // 🔹 Hämta användardata och contract_id från sessionStorage
    const userData = JSON.parse(sessionStorage.getItem("userData"));
    const contractId = sessionStorage.getItem("contract_id");

    // 🔍 Debug-loggar för att identifiera problemet
    console.log("🔍 Debug: sessionStorage userData:", userData);
    console.log("🔍 Debug: sessionStorage contract_id:", contractId);

    if (!userData || !userData.id || !contractId) {
        console.error("❌ Användare saknas eller contract_id är null!");
        alert("Ingen användare inloggad eller saknar kontrakt. Du loggas ut.");
        sessionStorage.clear();
        window.location.href = "userDashboard.html"; // Skickar användaren till dashboarden
        return;
    }

    // 🔹 Bygg JSON-data för POST-anropet
    const postData = {
        user_id: userData.id,
        contract_id: contractId,
        text: text.trim()
    };

    console.log("📌 Skickar Post-It till backend:", postData);

    fetch(`${BASE_URL}/userapi/postit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData)
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            console.error("⛔ Obehörig! Loggar ut användaren...");
            sessionStorage.clear();
            window.location.href = "userDashboard.html"; 
            return;
        }
        if (!response.ok) {
            throw new Error(`❌ Misslyckades med att spara Post-It! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (!data) return;
        console.log("✅ Post-It sparad i backend:", data);
        loadPostIts(); // Ladda om listan
    })
    .catch(error => {
        console.error("❌ Fel vid sparning av Post-It:", error);
        alert("Kunde inte spara Post-It. Kontrollera anslutningen och försök igen.");
    });
}

// --------------------------------------------------------------------------
// ✅ Ladda Post-Its
// -------------------------------------------------------------------------
function loadPostIts() {
    fetch(`${BASE_URL}/userapi/postit`)
        .then(response => response.json())
        .then(data => {
            postItContainer.innerHTML = ""; // 🟢 Rensa container innan ny data läggs in
            
            data.forEach(post => {
                const card = document.createElement("div");
                card.classList.add("col-md-4", "mb-3", "post-it");

                card.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-subtitle mb-2 text-muted">Upprättad av</h6>
                            <h6 class="card-subtitle mb-2 text-muted">${post.c_name}</h6>
                            <p class="card-text preview">${post.text.substring(0, 50)}...</p>
                            <p class="card-text full-text d-none">${post.text}</p>
                            <button class="btn btn-sm btn-outline-secondary expand-btn">Mer...</button>
                            <button class="btn btn-sm btn-danger mx-1 delete-btn">🗑️</button>
                        </div>
                    </div>
                `;


                const expandBtn = card.querySelector(".expand-btn");
                const deleteBtn = card.querySelector(".delete-btn");

                expandBtn.addEventListener("click", function () {
                    togglePostItExpand(card, expandBtn);
                });

                deleteBtn.addEventListener("click", function (event) {
                    event.stopPropagation();
                    deletePostIt(post.id);
                });

                postItContainer.appendChild(card);
                addDragAndDropToPostIt(card); // 🟢 Lägg till drag & drop på varje ny post-it
            });

            initializeDragAndDrop(); // 🟢 Nu finns lapparna, så vi kan initiera drag & drop!
        })
        .catch(error => console.error("❌ Fel vid hämtning av Post-Its:", error));
}

// ✅ Toggle för Post-It (expandera/minimera)
// Enkel Toggle för Post-It (expandera/minimera)
function togglePostItExpand(card, button) {
    if (!card || !button) return;

    let postId = card.dataset.postId; // Hämta postens unika ID
    let previewText = card.querySelector(".preview");
    let fullText = card.querySelector(".full-text");

    if (!previewText || !fullText) return;

    // Om kortet är i preview-läge → Expandera
    if (card.dataset.expanded === "false") {
        previewText.innerHTML = fullText.innerHTML; // Sätt fulltext
        button.innerText = "Mindre";
        card.dataset.expanded = "true"; // Uppdatera status
    } else {
        // Om kortet är expanderat → Gå tillbaka till preview
        previewText.innerHTML = fullText.innerHTML.substring(0, 50) + "..."; // Sätt preview-text
        button.innerText = "Mer";
        card.dataset.expanded = "false"; // Uppdatera status
    }
}

// ✅ Radera Post-It (med en confirm och omladdning)
function deletePostIt(postitId) {
    if (!confirm("⚠️ Är du säker på att du vill radera denna Post-It?")) {
        return;
    }

    fetch(`${BASE_URL}/userapi/postit/${postitId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("❌ Kunde inte radera Post-It!");
        }
        return response.json();
    })
    .then(data => {
        console.log("🗑️ Post-It raderad:", data);
        loadPostIts(); // Ladda om listan efter radering
    })
    .catch(error => console.error("❌ Fel vid radering av Post-It:", error));
}

// -----------------------------------------------------------------
// Fixar drag på nya 
// ---------------------------------------------------------------.-
function addDragAndDropToPostIt(postIt) {
    if (!postIt) return;

    postIt.setAttribute("draggable", "true");

    postIt.addEventListener("dragstart", function (e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", this.id);
        this.classList.add("dragging");
    });

    postIt.addEventListener("dragend", function () {
        this.classList.remove("dragging");
    });
}



