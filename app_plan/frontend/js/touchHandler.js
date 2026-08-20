// ✅ touchHandler.js – Hanterar touchbaserad drag & drop för To-Dos

let draggedTodo = null;
let touchStartX = 0, touchStartY = 0;

export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints;
}

export function handleTouchStart(event) {
    console.log("📱 Touchstart registrerad på:", event.target);

    draggedTodo = event.target.closest(".todo-card");
    if (!draggedTodo) {
        console.log("❌ Inget kort hittades vid touchstart. Event träffade:", event.target);
        return;
    }

    console.log("✅ Touch registrerad på To-Do kortet!", draggedTodo);
}

export function handleTouchMove(event) {
    event.preventDefault();
    console.log("📱 Touchmove registrerad!");

    if (!draggedTodo) return;

    let touch = event.touches[0];
    draggedTodo.style.position = "absolute";
    draggedTodo.style.left = `${touch.clientX}px`;
    draggedTodo.style.top = `${touch.clientY}px`;
}

export async function handleTouchEnd(event) {
    console.log("📱 Touchend registrerad!");

    if (!draggedTodo) {
        console.log("❌ Ingen To-Do var vald vid touchend.");
        return;
    }

    let touchEndX = event.changedTouches[0].clientX;
    let touchEndY = event.changedTouches[0].clientY;

    let movedX = Math.abs(touchEndX - touchStartX);
    let movedY = Math.abs(touchEndY - touchStartY);

    console.log(`📍 Touch slutpunkt: (${touchEndX}, ${touchEndY})`);
    console.log(`📏 Förflyttning: X=${movedX}, Y=${movedY}`);

    if (movedX > 50 || movedY > 50) {
        let targetLane = document.elementFromPoint(touchEndX, touchEndY)?.closest(".todo-lane");

        if (targetLane) {
            let newProgress = targetLane.dataset.progress;
            let todoId = draggedTodo.dataset.todoId;

            console.log(`📲 To-Do ${todoId} flyttas till ${newProgress}`);

            targetLane.appendChild(draggedTodo);
            await updateTodoStatus(todoId, newProgress);
        } else {
            console.log("⚠️ Ingen giltig lane hittades vid touchend.");
        }
    }

    draggedTodo.classList.remove("dragging");
    draggedTodo = null;
}




