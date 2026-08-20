let recognition; // Röstigenkänning
let isRecording = false; // Status för inspelning
let collectedText = ""; // Samlar all text
let lastTranscript = ""; // Håller koll på senaste transkriberingen
let textArea = document.getElementById("postItText");
const postItContainer = document.getElementById("postItContainer");
let stopTimeout; 
let transcriptSet = new Set();  // 🟢 Lagra unika transkriberingar

/// ----------------------------------------------------------------
// 📌 Sidladdning – Startar när DOM är redo
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 Initierar Post-It-sidan");

    const ok = await initUserSession();
    if (!ok) return;

    // ✅ Plocka rätt namn manuellt från sessionStorage
    const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    const name = userData.c_name || "Vän";
    document.querySelector("#dashboardUser").textContent = `Välkommen, ${name}`;

    // ✅ Resterande funktioner
    loadPostIts();
    initializeSpeechRecognition();

    const postItText = document.getElementById("postItText");
    const modal = new bootstrap.Modal(document.getElementById("postItModal"));

    document.querySelector("#openPostItModal").addEventListener("click", () => {
        postItText.value = "";
        modal.show();
    });

    document.querySelector("#savePostIt").addEventListener("click", () => {
        const text = postItText.value.trim();
        if (text) {
            savePostItToDB(text);
            modal.hide();
        }
    });

    document.querySelector("#startRecording").addEventListener("click", startSpeechRecognition);
    document.querySelector("#stopRecording").addEventListener("click", stopSpeechRecognition);

    console.log("✅ Post-It är redo");
});


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

//---------------------------------------------------------------
// Lampa som säger att du är in the air
//---------------------------------------------------------------
const statusIndicator = document.getElementById("aiStatus");

function updateStatusIndicator(active) {
    if (!statusIndicator) return;
    statusIndicator.style.backgroundColor = active ? "#198754" : "#dc3545"; // Grön/Röd
    statusIndicator.title = active ? "AI är aktiv 🎤" : "AI är vilande ⏸️";
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

    fetch(`${BASE_URL}/postit`, {
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
    fetch(`${BASE_URL}/postit`)
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
            });            
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

    fetch(`${BASE_URL}/postit/${postitId}`, {
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





