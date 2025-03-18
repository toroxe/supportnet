// 🟡 BASE_URL till backend
const BASE_URL = "https://my.supportnet.se";

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

// 🟡 Ladda projektinfo från To-Do
function loadProjectInfo() {
    fetch(`${BASE_URL}/todos/1`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + sessionStorage.getItem("authToken") // Om vi behöver auth!
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP-fel ${response.status}`);
        return response.json();
    })
    .then(data => {
        document.querySelector("#projectTitle").textContent = data.title || "Ingen titel";
        document.querySelector("#projectDescription").textContent = data.text || "Ingen beskrivning";
    })
    .catch(error => console.error("Fel vid hämtning av projektinfo:", error));
}

// 🟡 Spara ny uppgift
document.querySelector("#createTaskForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const newTask = {
        todo_id: 1, // Kopplas till projektets ID, uppdatera vid behov
        title: document.querySelector("#taskTitle").value,
        text: document.querySelector("#taskText").value,
        progress: parseInt(document.querySelector("#taskProgress").value),
        start_date: document.querySelector("#taskStartDate").value,
        due_date: document.querySelector("#taskDueDate").value
    };

    fetch(`${BASE_URL}/tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
    })
    .then(response => response.json())
    .then(() => {
        alert("Uppgift skapad!");
        // Ladda om tasks i gridden här om vi vill
    })
    .catch(error => console.error("Fel vid skapande av uppgift:", error));
});

// 🟡 Spara ny rapport
document.querySelector("#createReportForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const newReport = {
        task_id: parseInt(document.querySelector("#reportTaskId").value),
        report_text: document.querySelector("#reportText").value
    };

    fetch(`${BASE_URL}/task_reports/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReport)
    })
    .then(response => response.json())
    .then(() => {
        alert("Rapport sparad!");
    })
    .catch(error => console.error("Fel vid skapande av rapport:", error));
});

// 🟡 Ladda tasks till gridden
function loadTasks() {
    fetch(`${BASE_URL}/tasks/`)
        .then(response => response.json())
        .then(tasks => {
            const taskTitles = document.querySelector("#taskTitles");
            taskTitles.innerHTML = ""; // Rensa innan render

            tasks.forEach(task => {
                const taskDiv = document.createElement("div");
                taskDiv.textContent = task.title;
                taskDiv.classList.add("task-title");

                // 💡 Färg baserat på progress
                if (task.progress <= 25) {
                    taskDiv.style.backgroundColor = "#ffcccc"; // Rödaktig
                } else if (task.progress <= 75) {
                    taskDiv.style.backgroundColor = "#fff5cc"; // Gulaktig
                } else {
                    taskDiv.style.backgroundColor = "#ccffcc"; // Grönaktig
                }

                taskTitles.appendChild(taskDiv);
            });

            // Här kan vi senare koppla in datumrendering också
        })
        .catch(error => console.error("Fel vid hämtning av tasks:", error));
}

// 🟡 Starta laddning av allt när sidan är redo
window.addEventListener("DOMContentLoaded", () => {
    loadProjectInfo();
    loadTasks();
});
