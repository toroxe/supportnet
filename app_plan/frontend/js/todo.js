import { isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd } from "./touchHandler.js";

console.log("🔍 Kontroll: `touchHandler.js` importerat!");
console.log("📌 isTouchDevice finns:", typeof isTouchDevice);
console.log("📌 handleTouchStart finns:", typeof handleTouchStart);
console.log("📌 handleTouchMove finns:", typeof handleTouchMove);
console.log("📌 handleTouchEnd finns:", typeof handleTouchEnd);

const BASE_URL = "https://my.supportnet.se/userapi";
let token = sessionStorage.getItem("authToken");

// 🌍 Globala variabler
let userData = JSON.parse(sessionStorage.getItem("userData"));
let contractId = sessionStorage.getItem("contract_id");
let deviceType = sessionStorage.getItem("deviceType");
console.log("📌 Enhet identifierad från sessionStorage:", deviceType);

// Hitta alla lanes baserat på data-status
const lanes = {
    "ej påbörjad": null,
    "påbörjad": null,
    "avslutad": null
};

// ✅ Kontrollera och sätt contract_id om det saknas
if (!contractId && userData && userData.contract) {
    sessionStorage.setItem("contract_id", userData.contract);
    console.log("🔄 Återställde contract_id i sessionStorage:", userData.contract);
}

document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 Att göra-sidan laddad!");

    if (!contractId) {
        console.error("⛔ Ingen contract_id tillgänglig! Något gick fel.");
        return;
    }

    console.log("✅ Användardata:", userData);
    console.log("✅ Contract ID:", contractId);

    loadHeader();
    updateTodos();

    document.getElementById("todoForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        createOrUpdateTodo();
    });

    document.addEventListener("click", (e) => {
        const button = e.target;
        if (button.classList.contains("openTodo") && !button.disabled) {
            const todoId = button.getAttribute("data-id");
            openTodoModal(todoId);
        }
    });

    $(function() {
        $("tbody").sortable({
            items: ".todo-card",
            connectWith: "tbody",
            placeholder: "sortable-placeholder",
            stop: function(event, ui) {
                const todoId = ui.item.data("todoId");
                const newProgress = ui.item.closest("td").attr("id");

                if (!newProgress) {
                    console.error("❌ Kunde inte hitta progress vid drop!", ui.item);
                    return;
                }

                const nextCard = ui.item.next(".todo-card");
                let newPriority = "hög";

                if (nextCard.length) {
                    const nextTodoId = nextCard.data("todoId");
                    console.log(`🔍 Nästa kort ID: ${nextTodoId}`);
                    newPriority = "steget före nästa";
                }

                console.log(`📲 To-Do ${todoId} flyttades till ${newProgress} med prio ${newPriority}`);
                updateTodoStatus(todoId, newProgress, newPriority);
            }
        }).disableSelection();
    });

    const todoModal = document.getElementById('todoModal');
    if (todoModal) {
        todoModal.addEventListener('hidden.bs.modal', () => {
            console.log("🔄 Modal stängd – uppdaterar To-Dos...");
            updateTodos();
        });
    } else {
        console.warn("⚠️ Ingen modal hittades vid initiering.");
    }

    console.log("📲 jQuery UI sortable aktiverat!");
});

// -------------------- 🏗 Lanes för att hantera To-Do status --------------------
lanes["ej påbörjad"] = document.querySelector("#todoNotStarted");
lanes["påbörjad"] = document.querySelector("#todoInProgress");
lanes["avslutad"] = document.querySelector("#todoCompleted");

console.log("✅ Lanes återställda:", lanes);


// 🟢 Ladda headern dynamiskt
async function loadHeader() {
    console.log("🚀 Laddar header...");

    try {
        const response = await fetch("../userpages/userHeader.html");
        const headerHTML = await response.text();
        document.getElementById("header-placeholder").innerHTML = headerHTML;

        let userData = JSON.parse(sessionStorage.getItem("userData"));
        if (userData && userData.c_name) {
            document.getElementById("dashboardUser").textContent = `Välkommen, ${userData.c_name}!`;
        }

        // 🟢 Lägg till utloggningsfunktion
        document.getElementById("logoutButton").addEventListener("click", function () {
            console.log("👋 Användaren loggar ut...");
            sessionStorage.clear();
            window.location.href = "userDashboard.html";
        });

    } catch (error) {
        console.error("❌ Kunde inte ladda header:", error);
    }
}

// -----------------------------------------------------------------------------------
//  ✅ Hämta To-Dos från API och lagra dem i sessionStorage
// -----------------------------------------------------------------------------------

async function loadTodos() {
    let contractId = sessionStorage.getItem("contract_id");
    console.log("ContractId från sessionStorage:", contractId);

    if (!contractId) {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        console.log("userData från sessionStorage:", userData);

        if (userData && userData.contract_id) {
            contractId = userData.contract_id;
            sessionStorage.setItem("contract_id", contractId);
            console.log("ContractId satt från userData:", contractId);
        } else {
            console.error("Inget contractId hittades i sessionStorage eller userData!");
            return [];
        }
    }

    try {
        const response = await fetch(`${BASE_URL}/todo/${contractId}`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error(`Misslyckades att hämta To-Dos (${response.status})`);

        const todos = await response.json();
        todos.sort((a, b) => b.id - a.id);
        sessionStorage.setItem("todoData", JSON.stringify(todos));

        return todos;

    } catch (error) {
        console.error("Fel vid hämtning av To-Dos:", error);
        return [];
    }
}

// -------------------------------------------------------------------------
// ✅ Rendera To-Dos i rätt lanes
// -------------------------------------------------------------------------
function renderTodos(todos) {
    console.log("🟢 Renderar To-Dos som Cards...");

    document.getElementById("todoNotStarted").innerHTML = "";
    document.getElementById("todoInProgress").innerHTML = "";
    document.getElementById("todoCompleted").innerHTML = "";

    todos.forEach(todo => {
        let card = document.createElement("div");
        card.classList.add("card", "mb-2", "p-2", "todo-card");
        card.setAttribute("draggable", true);
        card.dataset.todoId = todo.id;

        let progressMap = {
            "ej påbörjad": "todoNotStarted",
            "påbörjad": "todoInProgress",
            "avslutad": "todoCompleted"
        };

        let targetLane = progressMap[todo.progress];

        if (targetLane) {
            document.getElementById(targetLane).appendChild(card);

            if (targetLane === "todoNotStarted") {
                card.classList.add("bg-warning");
            } else if (targetLane === "todoInProgress") {
                card.classList.add("bg-info");
            } else if (targetLane === "todoCompleted") {
                card.classList.add("bg-success", "text-white");
            }
        }

        const isDisabled = !todo.begin_date ? "disabled" : "";

        card.innerHTML = `
            <div class="card-body text-center">
                <div class="status-indicator mb-2" data-status="${todo.status}"></div>
                <h5 class="card-title"><strong>${todo.name}</strong></h5>
                <p class="card-text">${todo.text}</p>
                <p><small>Deadline: ${todo.due_date}</small></p>
                <button class="btn btn-primary openTodo" data-id="${todo.id}" ${isDisabled}>
                    Öppna
                </button>
            </div>
        `;
    });

    addOpenTodoListeners();
}

// ----------------------------------------------------------------------
// Stödfunktion till render
// -----------------------------------------------------------------------
function addOpenTodoListeners() {
    document.querySelectorAll(".openTodo").forEach(button => {
        button.addEventListener("click", function () {
            const todoId = this.dataset.id;
            openTodoModal(todoId); // Din funktion för att öppna modalen
        });
    });
}


// -------------------------------------------------------
// ✅ Huvudfunktion som både hämtar och renderar
// -------------------------------------------------------

async function updateTodos() {
    let todos = await loadTodos();
    renderTodos(todos);
}

// ----------------------------------------------------------------------------------------
// Renderar info i det modala formuläret
// ----------------------------------------------------------------------------------------
function openTodoModal(todoId) {
    console.log("🟢 Öppnar modal för To-Do ID:", todoId);

// 🔥 Lägg till detta
    sessionStorage.setItem("selectedTodoId", todoId);
    console.log("✅ selectedTodoId satt i sessionStorage:", todoId); 
    
    // 🟢 Kontrollera enhetstyp från sessionStorage
    let deviceType = sessionStorage.getItem("deviceType");
    console.log("📌 Enhet identifierad från sessionStorage:", deviceType);

    // 🟢 Växla mellan admin och user vy
    if (deviceType === "mobile") {
        console.log("📱 Mobil enhet – omdirigerar till tasks_user.html");
        window.location.href = "../userpages/tasks_user.html";
        return;
    } else {
        console.log("💻 PC-enhet – öppnar admin modal");
    }
    
    if (!todoId) {
        console.error("❌ Ingen To-Do ID angiven till openTodoModal!");
        return;
    }

    let todoData = JSON.parse(sessionStorage.getItem("todoData")) || [];
    let todo = todoData.find(t => t.id == todoId);

    if (!todo) {
        console.error("❌ Ingen To-Do hittades med ID:", todoId);
        return;
    }
    
    console.log("📌 To-Do hittad:", todo);

    let planeraButton = document.getElementById("planeraTodoButton");
    if (planeraButton) {
        planeraButton.disabled = !todo.begin_date;
    }

    let modal = document.getElementById("todoModal");
    let modalTitle = document.getElementById("todoModalLabel");
    let modalName = document.getElementById("todoName");
    let modalText = document.getElementById("todoText");
    let modalPriority = document.getElementById("todoPriority");
    let modalDueDate = document.getElementById("todoDueDate");
    let modalFinished = document.getElementById("todoFinished");
    let modalId = document.getElementById("todoId");
    let modalProgress = document.getElementById("todoProgress");
    let modalStatus = document.getElementById("todoStatus");
    let modalBeginDate = document.getElementById("todoBeginDate");

    if (!modal || !modalTitle || !modalName || !modalText || !modalPriority ||
        !modalDueDate || !modalFinished || !modalId || !modalProgress || !modalStatus || !modalBeginDate) {
        console.error("❌ Ett eller flera modal-element saknas!");
        return;
    }

    modalTitle.textContent = "Redigera To-Do";
    modalName.value = todo.name || "";
    modalText.value = todo.text || "";
    modalPriority.value = todo.priority || "låg";
    modalDueDate.value = todo.due_date || "";
    modalFinished.checked = todo.finished || false;
    modalId.value = todo.id;
    modalProgress.value = todo.progress || "ej påbörjad";
    modalStatus.value = todo.status || "ej planerad";
    modalBeginDate.value = todo.begin_date || "";

    console.log("✅ Modal fylld med data:", todo);

    let modalInstance = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
    modalInstance.show();

}

//----------------------------------------------------------------------------------------
// Hanterar funktione på planera knappen i modalen
// ---------------------------------------------------------------------------------------
function markTodoAsPlanned(todoId) {
    console.log("🟢 Planerar To-Do ID:", todoId);

    let todoElement = document.querySelector(`[data-id='${todoId}']`);
    if (!todoElement) {
        console.error("❌ Kunde inte hitta To-Do att planera!");
        return;
    }

    // Lägg till en CSS-klass för att färgsätta som planerad
    todoElement.classList.add("todo-planned");

    // Uppdatera i sessionStorage
    let todoData = JSON.parse(sessionStorage.getItem("todoData")) || [];
    let todo = todoData.find(t => t.id == todoId);
    if (todo) {
        todo.status = "planerad"; // Kan användas om vi vill spara detta i backend senare
        sessionStorage.setItem("todoData", JSON.stringify(todoData));
    }
}

// ---------------------------------------------------------------------------------------
// 🟢 Skapa ny To-Do eller uppdatera
// ---------------------------------------------------------------------------------------
async function createOrUpdateTodo() { 
    let todoIdElem = document.getElementById("todoId");
    let todoNameElem = document.getElementById("todoName");
    let todoTextElem = document.getElementById("todoText");
    let todoPriorityElem = document.getElementById("todoPriority");
    let todoDueDateElem = document.getElementById("todoDueDate");
    let todoFinishedElem = document.getElementById("todoFinished");
    let todoProgressElem = document.getElementById("todoProgress");
    let todoStatusElem = document.getElementById("todoStatus");
    let todoBeginDateElem = document.getElementById("todoBeginDate");

    let todoId = todoIdElem?.value?.trim() || ""; // Säkerställ att vi får rätt ID eller tomt sträng vid skapande

    let todoData = {
        name: todoNameElem?.value || "Utan titel",
        text: todoTextElem?.value || "Ingen beskrivning",
        priority: todoPriorityElem?.value || "låg",
        begin_date: todoBeginDateElem?.value || null,
        due_date: todoDueDateElem?.value || null,
        progress: todoProgressElem?.value || "ej påbörjad",
        status: todoStatusElem?.value || "ej planerad",
        contract_id: contractId,
        finished: todoFinishedElem?.checked || false
    };

    console.log("📤 Skickar To-Do:", JSON.stringify(todoData));

    let url = `${BASE_URL}/todo`;
    let method = "POST"; // Default: Skapa ny To-Do

    if (todoId) {
        url = `${BASE_URL}/todo/${todoId}`;
        method = "PATCH"; // Om ID finns: Uppdatera befintlig To-Do
        todoData.id = todoId; // Se till att ID inkluderas vid uppdatering
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(todoData)
        });

        if (!response.ok) throw new Error(`Misslyckades att spara To-Do (${response.status})`);

        console.log("✅ To-Do sparad:", await response.json());
        updateTodos(); // Uppdatera listan direkt
        bootstrap.Modal.getInstance(document.getElementById("todoModal")).hide();

    } catch (error) {
        console.error("❌ Fel vid spara av To-Do:", error);
    }
}

// ---------------------------------------------------------------------------------------
// ✅ Markera en To-Do som avslutad
// ---------------------------------------------------------------------------------------
async function completeTodo(todoId) {
    const todoData = { finished: true };

    console.log(`📤 Skickar PATCH för To-Do ${todoId}:`, JSON.stringify(todoData));

    try {
        const response = await fetch(`${BASE_URL}/todo/${todoId}`, {
            method: "PATCH",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(todoData)
        });

        if (!response.ok) throw new Error(`Misslyckades att uppdatera To-Do (${response.status})`);

        const updatedTodo = await response.json();
        console.log("✅ Uppdaterad To-Do:", updatedTodo);
        loadTodos(); // Uppdatera gränssnittet

    } catch (error) {
        console.error("❌ Fel vid uppdatering av To-Do:", error);
    }
}

// ----------------------------------------------------------------------------------
// ✅ Uppdatera To-Do Status (API-anrop)
// ----------------------------------------------------------------------------------
async function updateTodoStatus(todoId, newProgress) {
    console.log(`📡 Uppdaterar To-Do ID: ${todoId} till progress: ${newProgress}`);

    // Konvertera frontend-värden till backend ENUM-värden
    const progressMapping = {
        "todoNotStarted": "ej påbörjad",
        "todoInProgress": "påbörjad",
        "todoCompleted": "avslutad"
    };

    let validProgress = progressMapping[newProgress] || "ej påbörjad"; // Default om inget matchar

    try {
        const response = await fetch(`${BASE_URL}/todo/${todoId}`, {
            method: "PATCH",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ progress: validProgress }) 
        });

        if (!response.ok) {
            throw new Error(`Misslyckades att uppdatera progress (${response.status})`);
        }

        console.log("✅ Progress uppdaterad!");
        updateTodos(); // Uppdatera listan efter ändring

    } catch (error) {
        console.error("❌ Fel vid uppdatering av To-Do:", error);
    }
}



