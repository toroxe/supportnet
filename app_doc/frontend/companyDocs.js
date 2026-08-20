document.addEventListener("DOMContentLoaded", async () => {
    const serviceContainer = document.getElementById("serviceContainer");

    // Simulerat API-svar (blindbock)
    const fakeContracts = [
        { id: 1, name: "Testbolaget AB", services: ["documents", "support"] },
        { id: 2, name: "Andra Bolaget", services: ["support"] }
    ];

    console.log("🔍 Simulerade kontrakt:", fakeContracts);

    fakeContracts.forEach(contract => {
        if (contract.services.includes("documents")) { // Kontrollera om dokumenthantering är aktiverad
            const docButton = document.createElement("button");
            docButton.classList.add("btn", "btn-primary", "m-2");
            docButton.innerText = `Dokumenthantering (${contract.name})`;
            docButton.onclick = () => openDocuments(contract.id); // Funktion som öppnar dokumentvyn
            serviceContainer.appendChild(docButton);
        }
    });
});

function openDocuments(contractId) {
    alert(`Öppnar dokumenthantering för kontrakt ID: ${contractId}`);
}

