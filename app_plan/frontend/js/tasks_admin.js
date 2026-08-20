document.addEventListener("DOMContentLoaded", async () => {
    console.log("Laddar header...");
    await loadHeader();

    console.log("Laddar projektinfo...");
    await loadProjectInfo();

    console.log("Laddar uppgifter...");
    await loadTasks();

    console.log("Laddar To-Do info...");
    console.log("📌 SessionStorage:", JSON.stringify(sessionStorage, null, 2));
    await loadTodoInfo();
});

//------------------------------------------------------------------------
// poppar agila uppgiften
// -----------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("taskModal");
    const addTaskBtn = document.getElementById("add-task-btn");
    const closeModal = document.getElementById("close");

    // Öppna modal vid knapptryck
    addTaskBtn.addEventListener("click", function () {
        console.log("🟢 Öppnar modalen för ny uppgift...");
        modal.style.display = "flex";
    });

    // Stäng modal när man klickar på stängningsknappen
    closeModal.addEventListener("click", function () {
        console.log("🔴 Stänger modalen...");
        modal.style.display = "none";
    });

    // Stäng modal om man klickar utanför innehållet
    window.addEventListener("click", function (event) {
        if (event.target === modal) {
            console.log("🔴 Klick utanför modal – stänger...");
            modal.style.display = "none";
        }
    });
});

async function loadHeader() {
    try {
        const response = await fetch("/userpages/userHeader.html");
        if (!response.ok) throw new Error("Header kunde inte laddas.");
        const headerHtml = await response.text();
        document.querySelector("#header-container").innerHTML = headerHtml;
        console.log("Header laddad.");
    } catch (error) {
        console.error("Kunde inte ladda header:", error);
    }
}

async function loadProjectInfo() {
    try {
        const response = await fetch("/api/get_project_info");
        if (!response.ok) throw new Error("Projektinfo kunde inte laddas.");
        const data = await response.json();
        document.querySelector("#project-info").innerText = data.name || "Projektinfo ej tillgänglig";
        console.log("Projektinfo laddad.");
    } catch (error) {
        console.error("Fel vid hämtning av projektinfo:", error);
    }
}

async function loadTasks() {
    try {
        const response = await fetch("/api/get_tasks");
        if (!response.ok) throw new Error("Uppgifter kunde inte laddas.");
        const data = await response.json();
        const taskList = document.querySelector("#task-list");
        taskList.innerHTML = data.tasks.length ?
            data.tasks.map(task => `<li>${task.name}</li>`).join("") :
            "<li>Inga uppgifter ännu...</li>";
        console.log("Uppgifter laddade.");
    } catch (error) {
        console.error("Fel vid hämtning av tasks:", error);
    }
}

async function loadTodoInfo() {
    try {
        const todoData = JSON.parse(sessionStorage.getItem("todoData"));
        if (!todoData || !Array.isArray(todoData)) throw new Error("Ingen giltig To-Do data i sessionStorage.");

        const selectedTodoId = sessionStorage.getItem("selectedTodoId");
        console.log("🔍 Letar efter To-Do med ID:", selectedTodoId);
        console.log("📌 Tillgängliga To-Dos:", todoData);

        const todo = todoData.find(t => t.id == selectedTodoId);
        if (!todo) {
            console.warn("❌ Ingen matchande To-Do hittades för ID:", selectedTodoId);
            return;
        }

        document.querySelector("#todo-name").innerText = todo.name || "(Namnlös)";
        document.querySelector("#todo-description").innerText = todo.text || "Ingen beskrivning tillgänglig.";
        console.log("✅ To-Do info laddad: ", todo);
    } catch (error) {
        console.error("Fel vid hämtning av To-Do info:", error);
    }
}

