const BASE_URL = "https://my.supportnet.se/userapi/tasks";

document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 Task sidan laddad!");

    let token = sessionStorage.getItem("authToken");

    // Ladda header
    fetch("../userpages/userHeader.html")
        .then(response => response.text())
        .then(html => {
            document.getElementById("header-placeholder").innerHTML = html;
        })
        .catch(error => console.error("❌ Kunde inte ladda header:", error));

    // Hämta och rendera tasks
    loadTasks(token);
});

// Hämta och rendera tasks
async function loadTasks(token) {
    try {
        const response = await fetch(`${BASE_URL}/`, {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) throw new Error("Misslyckades att hämta Tasks");
        const tasks = await response.json();
        
        tasks.forEach(task => renderTask(task));
    } catch (error) {
        console.error("❌ Fel vid hämtning av Tasks:", error);
    }
}

// Rendera en Task
function renderTask(task) {
    const container = document.getElementById("taskList");
    
    const taskEl = document.createElement("div");
    taskEl.classList.add("task");
    taskEl.textContent = `${task.name} (${task.progress}%)`;
    
    container.appendChild(taskEl);
}
