export function renderAccordion(data) {
    const accordionContainer = document.getElementById("analytics-accordion");

    // Kontrollera om elementet finns i DOM
    if (!accordionContainer) {
        console.error("Element with ID 'analytics-accordion' not found.");
        return;
    }

    // Rensa innehåll i accordion
    accordionContainer.innerHTML = "";

    // Gruppdata efter IP-adress
    const groupedData = data.reduce((result, entry) => {
        const ip = entry.ip_address || "Okänd IP";
        if (!result[ip]) {
            result[ip] = { count: 0, region: entry.region, entries: [] };
        }
        result[ip].count++;
        result[ip].entries.push(entry);
        return result;
    }, {});

    // Rendera varje grupp (IP-adress)
    Object.entries(groupedData).forEach(([ip, group], index) => {
        const accordionItem = `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading-${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${index}" aria-expanded="false" aria-controls="collapse-${index}">
                        <span>${ip}</span> - <span>${group.count} anrop</span> - <span>${group.region}</span>
                        <span class="ms-2">
                            <span class="circle-indicator ${group.count > 1 ? "bg-success" : "bg-danger"}"></span>
                        </span>
                    </button>
                </h2>
                <div id="collapse-${index}" class="accordion-collapse collapse" aria-labelledby="heading-${index}" data-bs-parent="#analytics-accordion">
                    <div class="accordion-body">
                        <table class="table">
                            <thead class="table-dark">
                                <tr>
                                    <th>Sida</th>
                                    <th>Aktivitet</th>
                                    <th>Enhet</th>
                                    <th>Besök</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${group.entries
                                    .map(
                                        (entry, idx) => `
                                        <tr class="${idx % 2 === 0 ? "table-light" : "table-secondary"}">
                                            <td>${entry.page_url || "/"}</td>
                                            <td>${entry.action_type || "Klick"}</td>
                                            <td>${entry.user_agent || "Okänd"}</td>
                                            <td>${formatSessionDuration(entry.timevisit)}</td>
                                        </tr>`
                                    )
                                    .join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        accordionContainer.innerHTML += accordionItem;
    });
}

// Helper: Rund cirkelindikator
const style = document.createElement("style");
style.innerHTML = `
.circle-indicator {
    display: flex !important; /* Förhindra att Bootstrap påverkar */
    align-items: center !important; /* Vertikal centrering */
    justify-content: center !important; /* Horisontell centrering */
    width: 12px !important; /* Bredd */
    height: 12px !important; /* Höjd */
    border-radius: 50% !important; /* Gör cirkeln helt rund */
    margin-left: 10px !important; /* Utrymme till vänster */
    background-color: #28a745 !important; /* Standard grön färg */
    flex-shrink: 0 !important; /* Förhindra att cirkeln krymper */
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.3) !important; /* Lätt skugga för synlighet */
}
.bg-success {
    background-color: #28a745 !important;
}
.bg-danger {
    background-color: #dc3545 !important;
}

/* Varannan rad med olika färg */
.table-light {
    background-color: #f8f9fa; /* Ljusgrå */
}
.table-secondary {
    background-color: #e9ecef; /* Mörkare grå */
}
`;
document.head.appendChild(style);

// Helper: Formatera sessionens längd
function formatSessionDuration(startTimestamp) {
    const startTime = new Date(startTimestamp);
    const now = new Date();
    const durationInSeconds = Math.floor((now - startTime) / 1000);

    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;

    return `${minutes} min ${seconds} sek`;
}

// Load analytics data and render accordion
async function loadAnalytics() {
    try {
        const response = await fetch('/api/analytics');
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data = await response.json();

        renderAccordion(data);
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAnalytics();
});

