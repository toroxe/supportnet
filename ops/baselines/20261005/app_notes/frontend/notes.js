// File: app_notes/frontend/notes.js
// Version: 2026.10.05-01
// Source: UTV
// Status: VERIFIED
// Verified: Tord UA/PASS 2026-10-05 UTV browser CRUD med Bearer-token
// ------------------------------------------------------------

const API_URL = "http://127.0.0.1:8001";

const noteField = document.getElementById("note");
const speechButton = document.getElementById("speechButton");
const saveButton = document.getElementById("saveButton");
const copyButton = document.getElementById("copyButton");
const clearButton = document.getElementById("clearButton");
const notesList = document.getElementById("notesList");
const statusBox = document.getElementById("status");

let currentNoteId = null;
let recognition = null;
let listening = false;

/* ---------- STATUS ---------- */

function setStatus(message) {
    statusBox.textContent = message;
}

/* ---------- NOTES API ---------- */

async function notesFetch(url, options = {}) {
    const token = sessionStorage.getItem("authToken");

    if (!token) {
        setStatus("Logga in via MySupportNet för att använda Notes.");
        throw new Error("MSN-token saknas");
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        setStatus("Inloggningen har gått ut eller åtkomst till Notes saknas.");
    }

    return response;
}



async function loadNotes() {
    try {
        const response = await notesFetch(`${API_URL}/notes`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const notes = await response.json();
        renderNotes(notes);

    } catch (error) {
        console.error(error);
        notesList.innerHTML =
            '<div class="empty">Kunde inte hämta anteckningar.</div>';
    }
}

function renderNotes(notes) {
    notesList.innerHTML = "";

    if (!notes.length) {
        notesList.innerHTML =
            '<div class="empty">Inga sparade anteckningar ännu.</div>';
        return;
    }

    for (const note of notes) {
        const row = document.createElement("div");
        row.className = "note-row";

        const time = document.createElement("div");
        time.className = "note-time";
        time.textContent = formatDate(note.updated_at);

        const preview = document.createElement("div");
        preview.className = "note-preview";
        preview.textContent = note.content;

        preview.addEventListener("click", () => {
            currentNoteId = note.note_id;
            noteField.value = note.content;
            saveButton.textContent = "Uppdatera";
            setStatus("Anteckningen är öppnad.");
            noteField.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.type = "button";
        deleteButton.title = "Ta bort";
        deleteButton.textContent = "×";

        deleteButton.addEventListener("click", async (event) => {
            event.stopPropagation();
            await deleteNote(note.note_id);
        });

        row.appendChild(time);
        row.appendChild(preview);
        row.appendChild(deleteButton);

        notesList.appendChild(row);
    }
}

async function saveNote() {
    const content = noteField.value.trim();

    if (!content) {
        setStatus("Anteckningen är tom.");
        return;
    }

    try {
        let response;

        if (currentNoteId === null) {
            response = await notesFetch(`${API_URL}/notes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ content })
            });
        } else {
            response = await notesFetch(
                `${API_URL}/notes/${currentNoteId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ content })
                }
            );
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        clearEditor();
        setStatus("Sparad.");
        await loadNotes();

    } catch (error) {
        console.error(error);
        setStatus("Kunde inte spara anteckningen.");
    }
}

async function deleteNote(noteId) {
    try {
        const response = await notesFetch(
            `${API_URL}/notes/${noteId}`,
            { method: "DELETE" }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        if (currentNoteId === noteId) {
            clearEditor();
        }

        setStatus("Anteckningen är borttagen.");
        await loadNotes();

    } catch (error) {
        console.error(error);
        setStatus("Kunde inte ta bort anteckningen.");
    }
}

/* ---------- EDITOR ---------- */

function clearEditor() {
    currentNoteId = null;
    noteField.value = "";
    saveButton.textContent = "Spara";
}

saveButton.addEventListener("click", saveNote);

clearButton.addEventListener("click", () => {
    clearEditor();
    setStatus("");
    noteField.focus();
});

copyButton.addEventListener("click", async () => {
    if (!noteField.value) {
        setStatus("Det finns inget att kopiera.");
        return;
    }

    try {
        await navigator.clipboard.writeText(noteField.value);
        setStatus("Kopierad.");
    } catch {
        noteField.select();
        document.execCommand("copy");
        setStatus("Kopierad.");
    }
});

/* ---------- SPEECH ---------- */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();

    recognition.lang = "sv-SE";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let baseText = "";

    speechButton.addEventListener("click", () => {
        if (listening) {
            recognition.stop();
            return;
        }

        baseText = noteField.value.trim();

        recognition.start();
    });

    recognition.onstart = () => {
        listening = true;
        speechButton.textContent = "■ Stoppa";
        setStatus("Lyssnar…");
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript.trim())
            .filter(Boolean)
            .join(" ");

        noteField.value = [baseText, transcript]
            .filter(Boolean)
            .join(" ");
    };

    recognition.onend = () => {
        listening = false;
        speechButton.textContent = "🎤 Tala";
        setStatus("");
    };

    recognition.onerror = (event) => {
        console.error(event);

        listening = false;
        speechButton.textContent = "🎤 Tala";
        setStatus("Taligenkänningen avbröts.");
    };

} else {
    speechButton.disabled = true;
    speechButton.textContent = "Tal stöds inte";
}

/* ---------- DATE ---------- */

function formatDate(value) {
    const date = new Date(value);

    return date.toLocaleString(
        "sv-SE",
        {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

document.getElementById("logoutButton").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.replace("/user/auth/userLogin.html");
});

/* ---------- START ---------- */

loadNotes();
