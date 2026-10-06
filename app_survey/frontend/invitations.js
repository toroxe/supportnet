// File: app_survey/frontend/invitations.js
// Version: 2026.10.06-01
// Status: DEVELOPMENT

"use strict";

(() => {
    const get = id => document.getElementById(id);

    const labels = {
        CREATED: "Skapad",
        SENT: "Skickad",
        ANSWERED: "Besvarad",
        EXPIRED: "Utgången", REVOKED: "Återkallad"
    };

    let selectedSurvey = null;
    let selectedVersion = null;
    let createdInvitation = null;
    let working = false;
    let listRequest = 0;

    function status(message, error = false) {
        get("invitationStatus").textContent = message;
        get("invitationStatus").classList.toggle("error", error);
    }

    function dateText(value) {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        return value
            ? new Date(value).toLocaleString("sv-SE")
            : "—";
    }

    function route(surveyId, suffix = "") {
        return `surveys/${encodeURIComponent(surveyId)}` + suffix;
    }

    function updateControls() {
        const unavailable = working || !selectedSurvey || busy;

        get("createInvitationButton").disabled = unavailable || dirty;
        get("refreshInvitationsButton").disabled = unavailable;
        get("exportResponsesButton").disabled = unavailable;
        get("markCreatedSentButton").disabled =
            unavailable || !createdInvitation ||
            Boolean(createdInvitation.sent_at) ||
            Boolean(createdInvitation.revoked_at) ||
            Boolean(createdInvitation.answered_at);
    }

    function renderList(invitations, surveyId) {
        const container = get("invitationList");
        container.replaceChildren();

        if (!invitations.length) {
            container.append(element(
                "p", "Inga respondenter har lagts till ännu.", "muted"
            ));
            return;
        }

        for (const invitation of invitations) {
            const card = element("article", undefined, "question-card");
            card.classList.add("respondent-row");
            card.dataset.status = invitation.status;
            card.append(element("h3", invitation.label));
            card.append(element(
                "p",
                `${labels[invitation.status] || invitation.status}` +
                ` · formulärversion ${invitation.version}`
            ));

            const details = element("dl");

            for (const [title, value] of [
                ["Skapad", invitation.created_at],
                ["Skickad", invitation.sent_at],
                ["Besvarad", invitation.answered_at],
                ["Sista svarsdag", invitation.closes_on]
            ]) {
                details.append(
                    element("dt", title),
                    element("dd", dateText(value))
                );
            }

            card.append(details);

            const actions = element("div", undefined, "actions");

            if (invitation.status === "CREATED") {
                const button = actionButton("Markera skickad", () => {
                    changeInvitation(surveyId, invitation, "sent");
                });
                button.disabled = working;
                actions.append(button);
            }

            if (!invitation.answered_at && !invitation.revoked_at) {
                const button = actionButton("Återkalla länken", () => {
                    if (!window.confirm(
                        `Återkalla länken för ${invitation.label}?`
                    )) return;

                    changeInvitation(surveyId, invitation, "revoke");
                }, "danger");
                button.disabled = working;
                actions.append(button);
            }

            card.append(actions);
            container.append(card);
        }
    }

    async function refreshInvitations() {
        const surveyId = selectedSurvey;
        if (!surveyId) return;

        const request = ++listRequest;
        const invitations = await apiFetch(
            route(surveyId, "/invitations")
        );

        if (surveyId !== selectedSurvey || request !== listRequest) return;
        renderList(invitations, surveyId);
    }

    async function changeInvitation(surveyId, invitation, action) {
        if (working || surveyId !== selectedSurvey) return;

        working = true;
        updateControls();

        try {
            const result = await apiFetch(
                route(
                    surveyId,
                    `/invitations/${encodeURIComponent(
                        invitation.invitation_id
                    )}/${action}`
                ),
                { method: "POST" }
            );

            if (surveyId !== selectedSurvey) return;

            if (
                createdInvitation?.invitation_id === result.invitation_id
            ) {
                createdInvitation = result;
                if (result.revoked_at) {
                    get("createdInvitation").hidden = true;
                    get("invitationUrl").value = "";
                }
            }

            status(action === "sent"
                ? "Inbjudningen är markerad som skickad."
                : "Länken är återkallad.");

            await refreshInvitations();
        } catch (error) {
            if (surveyId === selectedSurvey) status(error.message, true);
        } finally {
            working = false;
            updateControls();
        }
    }

    async function createInvitation() {
        if (working || busy || !selectedSurvey) return;

        if (dirty) {
            status("Spara formulärändringarna innan du skapar länkar.", true);
            return;
        }

        const label = get("respondentLabel").value.trim();

        if (!label || label.length > 100) {
            status("Ange ett namn eller en etikett med 1–100 tecken.", true);
            get("respondentLabel").focus();
            return;
        }

        if (!get("createdInvitation").hidden) {
            if (!window.confirm(
                "Har du sparat den förra länken? " +
                "Den ersätts nu i visningen."
            )) return;
        }

        const surveyId = selectedSurvey;
        const version = selectedVersion;

        working = true;
        updateControls();

        try {
            const result = await apiFetch(
                route(surveyId, "/invitations"),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        label,
                        expected_version: version
                    })
                }
            );

            const url = new URL("respond.html", API_URL);
            // API_URL slutar på api/. Svarssidan ligger en nivå upp.
            url.pathname = url.pathname.replace(
                /\/api\/respond\.html$/, "/respond.html"
            );
            // Fragmentet skickas inte med sidans HTTP-begäran.
            url.hash = new URLSearchParams({ token: result.token }).toString();

            createdInvitation = result;
            get("invitationUrl").value = url.href;
            get("createdInvitation").hidden = false;
            get("respondentLabel").value = "";

            status(
                `Länk skapad för ${label}, version ${version}. ` +
                "Kopiera och spara den nu."
            );

            if (surveyId === selectedSurvey) {
                try {
                    await refreshInvitations();
                } catch (error) {
                    status(
                        "Länken är skapad, men listan kunde inte hämtas: " +
                        error.message,
                        true
                    );
                }
            }
        } catch (error) {
            status(error.message, true);
        } finally {
            working = false;
            updateControls();
        }
    }

    async function exportResponses() {
        const surveyId = selectedSurvey;
        if (!surveyId || working) return;

        working = true;
        updateControls();

        try {
            const responses = await apiFetch(
                route(surveyId, "/responses")
            );

            const blob = new Blob(
                [JSON.stringify({
                    survey_id: surveyId,
                    exported_at: new Date().toISOString(),
                    responses
                }, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(blob);
            const link = element("a");
            link.href = url;
            link.download = `survey-responses-${surveyId}.json`;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            status(`${responses.length} svar hämtade som JSON.`);
        } catch (error) {
            status(error.message, true);
        } finally {
            working = false;
            updateControls();
        }
    }

    function synchronize() {
        const changed =
            selectedSurvey !== currentSurveyId ||
            selectedVersion !== currentVersion;

        selectedSurvey = currentSurveyId;
        selectedVersion = currentVersion;

        get("invitationContext").textContent = selectedSurvey
            ? `${get("surveyName").value} · sparad version ${selectedVersion}` +
              (dirty ? " · Spara ändringarna innan nya länkar skapas." : "")
            : "Spara eller öppna en undersökning först.";

        if (changed) {
            ++listRequest;
            get("invitationList").replaceChildren();

            // Behåll den senast skapade länken tills nästa länk skapas.
            // Den kan därmed kopieras även efter ett formulärbyte.
            if (selectedSurvey) {
                refreshInvitations().catch(error => {
                    status(error.message, true);
                });
            }
        }

        // Knappen för den senast skapade länken får bara användas
        // när dess undersökning är öppnad.
        updateControls();
        if (
            createdInvitation &&
            createdInvitation.survey_id !== selectedSurvey
        ) {
            get("markCreatedSentButton").disabled = true;
        }
    }

    get("createInvitationButton").addEventListener(
        "click", createInvitation
    );

    get("refreshInvitationsButton").addEventListener("click", () => {
        refreshInvitations().catch(error => status(error.message, true));
    });

    get("exportResponsesButton").addEventListener(
        "click", exportResponses
    );

    get("copyInvitationButton").addEventListener("click", async () => {
        const input = get("invitationUrl");

        try {
            await navigator.clipboard.writeText(input.value);
            status("Länken är kopierad.");
        } catch {
            input.focus();
            input.select();
            status("Länken är markerad. Kopiera med Ctrl+C eller telefonens meny.");
        }
    });

    get("markCreatedSentButton").addEventListener("click", () => {
        if (!createdInvitation) return;
        changeInvitation(
            createdInvitation.survey_id, createdInvitation, "sent"
        );
    });

    new MutationObserver(synchronize).observe(
        get("versionInfo"),
        { childList: true, characterData: true, subtree: true }
    );

    document.addEventListener("input", synchronize);
    document.addEventListener("change", synchronize);
    document.addEventListener("click", () => {
        queueMicrotask(synchronize);
    });

    synchronize();
})();
