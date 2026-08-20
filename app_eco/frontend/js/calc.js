const months = ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
const calcBody = document.querySelector("#calc-body");
const totalRow = document.querySelector("#total-row");

function openAddModal(type) {
    document.querySelector("#entryType").value = type;
    document.querySelector("#entryLabel").value = "";
    for (let i = 0; i < 12; i++) {
        document.querySelector(`#month${i}`).value = 0;
    }
    const modal = new bootstrap.Modal(document.querySelector("#addEntryModal"));
    modal.show();
}
window.openAddModal = openAddModal;


function removeRow(btn) {
    btn.closest("tr").remove();
    updateTotals();
}

function updateTotals() {
    const openingBalance = parseFloat(document.querySelector("#openingBalance").value) || 0;
    const totals = new Array(12).fill(0);

    calcBody.querySelectorAll("tr").forEach(row => {
        const isIncome = row.classList.contains("income-row");
        row.querySelectorAll("td input[type='number']").forEach((input, i) => {
            const val = parseFloat(input.value) || 0;
            totals[i] += isIncome ? val : -val;
        });
    });

    totalRow.innerHTML = `<td colspan="2">Månadssaldo</td>` +
        totals.map(t => {
            const color = t < 0 ? 'red' : 'inherit';
            return `<td style="color: ${color};">${t.toFixed(2)} SEK</td>`;
        }).join("") +
        `<td></td>`;

        const endBalance = openingBalance + totals.reduce((sum, val) => sum + val, 0);
        let existing = document.querySelector("#endingBalance");
        if (!existing) {
            existing = document.createElement("div");
            existing.id = "endingBalance";
            existing.className = "text-end fw-bold mt-3 bg-white p-2 rounded shadow-sm";
            document.querySelector("main").appendChild(existing);
        }
        existing.innerHTML = `Utgående saldo: ${endBalance.toFixed(2)} SEK`;

}

window.removeRow = removeRow;

//===================================================================
//Logik för modal
//===================================================================

document.querySelector("#saveEntryBtn").addEventListener("click", () => {
    const type = document.querySelector("#entryType").value;
    const label = document.querySelector("#entryLabel").value;
    const values = [];
    for (let i = 0; i < 12; i++) {
        const val = parseFloat(document.querySelector(`#month${i}`).value) || 0;
        values.push(val);
    }

    const row = document.createElement("tr");
    row.classList.add(type === "income" ? "income-row" : "expense-row");

    row.innerHTML = `
        <td>${type === "income" ? "Intäkt" : "Utgift"}</td>
        <td><input type="text" class="form-control form-control-sm" value="${label}"></td>
        ${values.map(val => `<td><input type="number" class="form-control form-control-sm" value="${val}"></td>`).join("")}
        <td><button class="btn btn-sm btn-outline-danger" onclick="removeRow(this)">🗑</button></td>
    `;

    calcBody.appendChild(row);
    updateTotals();
    row.querySelectorAll("input").forEach(input => input.addEventListener("input", updateTotals));

    bootstrap.Modal.getInstance(document.querySelector("#addEntryModal")).hide();
});
