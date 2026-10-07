// File: app_survey/frontend/invitations.js
// Version: 2026.10.07-01
// Status: DEVELOPMENT

"use strict";

(() => {
    const get = id => document.getElementById(id);

    const labels = {
        CREATED: "Skapad",
        SENT: "Skickad",
        ANSWERED: "Besvarad",
        EXPIRED: "Utgången",
        REVOKED: "Återkallad"
    };

    const priority = {
        CREATED: 0,
        SENT: 1,
        ANSWERED: 2,
        EXPIRED: 3,
        REVOKED: 4
    };

    let selectedSurvey = null;
    let selectedVersion = null;
    let createdInvitation = null;
    let working = false;
    let listRequest = 0;
    let showHidden = false;

    // Kopiering gäller den aktuella länken under detta sidbesök.
    // Efter omladdning behöver länken kopieras igen.
    const copiedLinks = new Map();
    const sentButtons = new Map();

    function status(message, error = false) {
        get("invitationStatus").textContent = message;
        get("invitationStatus").classList.toggle("error", error);
    }

    function dateText(value) {
        if (!value) return "—";

        return /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? value
            : new Date(value).toLocaleString("sv-SE");
    }

    function route(surveyId, suffix = "") {
        return `surveys/${encodeURIComponent(surveyId)}${suffix}`;
    }

    function linkUrl(token) {
        const url = new URL("../respond.html", API_URL);
        url.hash = new URLSearchParams({ token }).toString();
        return url.href;
    }

    const showHiddenButton = actionButton("Visa dolda", () => {
        if (working || busy || !selectedSurvey) return;

        showHidden = !showHidden;

        showHiddenButton.textContent = showHidden
            ? "Dölj dolda"
            : "Visa dolda";

        showHiddenButton.setAttribute(
            "aria-pressed",
            String(showHidden)
        );

        refreshInvitations().catch(error => {
            status(error.message, true);
        });
    });

    showHiddenButton.setAttribute("aria-pressed", "false");

    get("refreshInvitationsButton").parentElement.append(
        showHiddenButton
    );

    const closeLinkButton = actionButton("Spara/stäng", closeLink);
    closeLinkButton.id = "closeInvitationButton";

    get("markCreatedSentButton").parentElement.append(
        closeLinkButton
    );

    const explanation = get("createdInvitation")
        .querySelector("p.muted");

    if (explanation) {
        explanation.textContent =
            "Respondenten och länken är redan sparade. " +
            "Spara/stäng behåller status Skapad. Kopiera länken och " +
            "skicka den själv innan du markerar Skickad.";
    }

    function updateControls() {
        const unavailable = working || busy || !selectedSurvey;

        get("createInvitationButton").disabled =
            unavailable || dirty;

        get("refreshInvitationsButton").disabled = unavailable;
        get("exportResponsesButton").disabled = unavailable;
        showHiddenButton.disabled = unavailable;

        get("copyInvitationButton").disabled =
            unavailable ||
            !createdInvitation ||
            !get("invitationUrl").value;

        closeLinkButton.disabled =
            unavailable || !createdInvitation;

        get("markCreatedSentButton").disabled =
            unavailable ||
            !createdInvitation ||
            createdInvitation.survey_id !== selectedSurvey ||
            createdInvitation.status !== "CREATED" ||
            !copiedLinks.has(createdInvitation.invitation_id);

        get("invitationList").querySelectorAll("button")
            .forEach(button => {
                button.disabled = unavailable;
            });

        for (const [id, button] of sentButtons) {
            button.disabled =
                unavailable || !copiedLinks.has(id);

            button.title = copiedLinks.has(id)
                ? "Bekräfta att du har skickat länken"
                : "Hämta och kopiera länken först";
        }
    }

    function clearLink() {
        createdInvitation = null;
        get("createdInvitation").hidden = true;
        get("invitationUrl").value = "";
    }

    function closeLink() {
        if (working || busy || !createdInvitation) return;

        const invitation = createdInvitation;

        clearLink();

        status(
            `${invitation.label} och länken är sparade. ` +
            "Länkfältet är stängt; status ändras inte."
        );

        updateControls();
    }

    function showLink(invitation) {
        const url = linkUrl(invitation.token);

        if (copiedLinks.get(invitation.invitation_id) !== url) {
            copiedLinks.delete(invitation.invitation_id);
        }

        const { token, ...metadata } = invitation;
        createdInvitation = metadata;

        get("invitationUrl").value = url;
        get("createdInvitation").hidden = false;

        get("createdInvitation").querySelector("h3").textContent =
            `Personlig länk – ${invitation.label}`;

        updateControls();
    }

    function renderList(invitations, surveyId) {
        const container = get("invitationList");
        container.replaceChildren();
        sentButtons.clear();

        if (!invitations.length) {
            container.append(element(
                "p",
                "Inga respondenter att visa.",
                "muted"
            ));

            updateControls();
            return;
        }

        const sorted = [...invitations].sort((a, b) =>
            (priority[a.status] ?? 5) - (priority[b.status] ?? 5) ||
            b.created_at.localeCompare(a.created_at) ||
            a.invitation_id.localeCompare(b.invitation_id)
        );

        for (const invitation of sorted) {
            const card = element(
                "article",
                undefined,
                "question-card respondent-row"
            );

            card.dataset.status = invitation.status;

            card.classList.toggle(
                "is-hidden",
                Boolean(invitation.hidden_at)
            );

            card.append(element(
                "h3",
                invitation.label +
                (invitation.hidden_at ? " · Dold" : "")
            ));

            if (invitation.status === "CREATED") {
                const actions = element(
                    "div",
                    undefined,
                    "actions respondent-link-actions"
                );

                actions.append(actionButton(
                    invitation.link_saved ? "Hämta länk" : "Ny länk",
                    () => retrieveLink(
                        surveyId,
                        invitation,
                        !invitation.link_saved
                    )
                ));

                const sentButton = actionButton(
                    "Markera skickad",
                    () => changeInvitation(
                        surveyId,
                        invitation,
                        "sent"
                    )
                );

                sentButtons.set(
                    invitation.invitation_id,
                    sentButton
                );

                actions.append(sentButton);
                card.append(actions);
            } else {
                copiedLinks.delete(invitation.invitation_id);
            }

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

            const management = element(
                "div",
                undefined,
                "respondent-management"
            );

            if (
                ["CREATED", "SENT"].includes(invitation.status) &&
                invitation.link_saved
            ) {
                management.append(actionButton(
                    "Ny länk",
                    () => retrieveLink(
                        surveyId,
                        invitation,
                        true
                    )
                ));
            }

            if (!invitation.answered_at && !invitation.revoked_at) {
                management.append(actionButton(
                    "Återkalla",
                    () => {
                        if (working || busy) return;

                        if (window.confirm(
                            `Återkalla länken för ${invitation.label}?`
                        )) {
                            changeInvitation(
                                surveyId,
                                invitation,
                                "revoke"
                            );
                        }
                    },
                    "danger"
                ));
            }

            const visibility = actionButton(
                invitation.hidden_at ? "Visa igen" : "×",
                () => {
                    if (working || busy) return;

                    if (!invitation.hidden_at && !window.confirm(
                        `Dölj ${invitation.label}? Länk och svar finns kvar. ` +
                        "Raden kan hämtas med Visa dolda."
                    )) return;

                    changeInvitation(
                        surveyId,
                        invitation,
                        invitation.hidden_at ? "restore" : "hide"
                    );
                }
            );

            visibility.setAttribute(
                "aria-label",
                `${invitation.hidden_at ? "Visa igen" : "Dölj"}: ` +
                invitation.label
            );

            visibility.title = invitation.hidden_at
                ? "Visa raden igen"
                : "Dölj raden";

            management.append(visibility);
            card.append(management);
            container.append(card);
        }

        updateControls();
    }

    async function refreshInvitations() {
        const surveyId = selectedSurvey;
        if (!surveyId) return;

        const request = ++listRequest;

        const invitations = await apiFetch(
            route(
                surveyId,
                `/invitations?include_hidden=${showHidden}`
            )
        );

        if (
            surveyId !== selectedSurvey ||
            request !== listRequest
        ) return;

        renderList(invitations, surveyId);

        if (createdInvitation?.survey_id === surveyId) {
            const current = invitations.find(item =>
                item.invitation_id ===
                createdInvitation.invitation_id
            );

            if (current) {
                createdInvitation = current;

                if (
                    current.hidden_at ||
                    !["CREATED", "SENT"].includes(current.status)
                ) {
                    clearLink();
                }
            }
        }

        updateControls();
    }

    async function refreshAfterSuccess(surveyId, message) {
        if (surveyId !== selectedSurvey) return;

        try {
            await refreshInvitations();

            if (surveyId === selectedSurvey) {
                status(message);
            }
        } catch (error) {
            if (surveyId === selectedSurvey) {
                status(
                    message +
                    ` Listan kunde inte uppdateras: ${error.message}`,
                    true
                );
            }
        }
    }

    async function retrieveLink(surveyId, invitation, replacing) {
        if (working || busy || surveyId !== selectedSurvey) return;

        if (replacing && !window.confirm(
            `Skapa en ny länk för ${invitation.label}? ` +
            "Den gamla länken spärras. Status återställs till Skapad."
        )) return;

        working = true;
        updateControls();

        try {
            const result = await apiFetch(
                route(
                    surveyId,
                    `/invitations/${encodeURIComponent(
                        invitation.invitation_id
                    )}/` +
                    (replacing ? "replace-link" : "link")
                ),
                replacing ? { method: "POST" } : {}
            );

            if (surveyId !== selectedSurvey) return;

            if (replacing) {
                copiedLinks.delete(invitation.invitation_id);
            }

            showLink(result);

            await refreshAfterSuccess(
                surveyId,
                replacing
                    ? `Ny länk sparad för ${result.label}. ` +
                      "Den gamla länken är spärrad."
                    : `Länken för ${result.label} är hämtad. ` +
                      "Kopiera eller välj Spara/stäng."
            );
        } catch (error) {
            if (surveyId === selectedSurvey) {
                status(error.message, true);
            }
        } finally {
            working = false;
            updateControls();
        }
    }

    async function changeInvitation(surveyId, invitation, action) {
        if (working || busy || surveyId !== selectedSurvey) return;

        if (action === "sent") {
            if (!copiedLinks.has(invitation.invitation_id)) {
                status(
                    "Hämta och kopiera länken innan du markerar Skickad.",
                    true
                );
                return;
            }

            if (!window.confirm(
                `Har du skickat den kopierade länken till ${invitation.label}?`
            )) return;
        }

        working = true;
        updateControls();

        try {
            await apiFetch(
                route(
                    surveyId,
                    `/invitations/${encodeURIComponent(
                        invitation.invitation_id
                    )}/${action}`
                ),
                { method: "POST" }
            );

            if (surveyId !== selectedSurvey) return;

            if (["sent", "revoke", "hide"].includes(action)) {
                copiedLinks.delete(invitation.invitation_id);

                if (
                    createdInvitation?.invitation_id ===
                    invitation.invitation_id
                ) {
                    clearLink();
                }
            }

            const messages = {
                sent:
                    "Inbjudningen är markerad som skickad. " +
                    "Länkfältet är stängt.",
                hide:
                    "Respondenten är dold. Länk och svar finns kvar.",
                restore:
                    "Respondenten visas igen.",
                revoke:
                    "Länken är återkallad."
            };

            await refreshAfterSuccess(
                surveyId,
                messages[action] || "Respondenten är uppdaterad."
            );
        } catch (error) {
            if (surveyId === selectedSurvey) {
                status(error.message, true);
            }
        } finally {
            working = false;
            updateControls();
        }
    }

    async function createInvitation() {
        if (working || busy || !selectedSurvey) return;

        if (dirty) {
            status(
                "Spara formulärändringarna innan du skapar länkar.",
                true
            );
            return;
        }

        const label = get("respondentLabel").value.trim();

        if (!label || label.length > 100) {
            status(
                "Ange ett namn eller en etikett med 1–100 tecken.",
                true
            );

            get("respondentLabel").focus();
            return;
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
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        label,
                        expected_version: version
                    })
                }
            );

            if (surveyId !== selectedSurvey) return;

            showLink(result);
            get("respondentLabel").value = "";

            await refreshAfterSuccess(
                surveyId,
                `${label} och länken är sparade. ` +
                "Kopiera nu eller välj Spara/stäng för att skicka senare."
            );
        } catch (error) {
            if (surveyId === selectedSurvey) {
                status(error.message, true);
            }
        } finally {
            working = false;
            updateControls();
        }
    }

    async function copyLink() {
        if (
            working ||
            busy ||
            !createdInvitation ||
            !get("invitationUrl").value
        ) return;

        const invitation = createdInvitation;
        const surveyId = selectedSurvey;
        const value = get("invitationUrl").value;

        working = true;
        updateControls();

        try {
            let copied = false;

            try {
                await navigator.clipboard.writeText(value);
                copied = true;
            } catch {
                const input = get("invitationUrl");

                if (input.value === value) {
                    input.focus();
                    input.select();
                    copied = document.execCommand("copy");
                }
            }

            if (!copied) {
                throw new Error(
                    "Kopieringen kunde inte bekräftas. " +
                    "Försök med Kopiera länken igen."
                );
            }

            if (surveyId !== selectedSurvey) return;

            copiedLinks.set(invitation.invitation_id, value);

            status(
                `Länken för ${invitation.label} är kopierad. ` +
                "Skicka den själv och välj sedan Markera skickad. " +
                "Du kan också välja Spara/stäng."
            );
        } catch (error) {
            if (surveyId === selectedSurvey) {
                status(error.message, true);
            }
        } finally {
            working = false;
            updateControls();
        }
    }

    async function exportResponses() {
        const surveyId = selectedSurvey;
        if (!surveyId || working || busy) return;

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

            if (surveyId === selectedSurvey) {
                status(`${responses.length} svar hämtade som JSON.`);
            }
        } catch (error) {
            if (surveyId === selectedSurvey) {
                status(error.message, true);
            }
        } finally {
            working = false;
            updateControls();
        }
    }

    function synchronize() {
        const changed =
            selectedSurvey !== currentSurveyId ||
            selectedVersion !== currentVersion;

        const surveyChanged =
            selectedSurvey !== currentSurveyId;

        selectedSurvey = currentSurveyId;
        selectedVersion = currentVersion;

        const context = selectedSurvey
            ? `${get("surveyName").value} · sparad version ` +
              `${selectedVersion}` +
              (dirty
                  ? " · Spara ändringarna innan nya länkar skapas."
                  : "")
            : "Spara eller öppna en undersökning först.";

        if (get("invitationContext").textContent !== context) {
            get("invitationContext").textContent = context;
        }

        if (surveyChanged) {
            clearLink();
            status("");
        }

        if (changed) {
            ++listRequest;
            sentButtons.clear();
            get("invitationList").replaceChildren();

            if (selectedSurvey) {
                refreshInvitations().catch(error => {
                    status(error.message, true);
                });
            }
        }

        updateControls();
    }

    get("createInvitationButton").addEventListener(
        "click",
        createInvitation
    );

    get("refreshInvitationsButton").addEventListener("click", () => {
        if (working || busy) return;

        refreshInvitations().catch(error => {
            status(error.message, true);
        });
    });

    get("exportResponsesButton").addEventListener(
        "click",
        exportResponses
    );

    get("copyInvitationButton").addEventListener(
        "click",
        copyLink
    );

    get("markCreatedSentButton").addEventListener("click", () => {
        if (createdInvitation) {
            changeInvitation(
                createdInvitation.survey_id,
                createdInvitation,
                "sent"
            );
        }
    });

    new MutationObserver(synchronize).observe(
        get("versionInfo"),
        {
            childList: true,
            characterData: true,
            subtree: true
        }
    );

    document.addEventListener("input", synchronize);
    document.addEventListener("change", synchronize);

    document.addEventListener("click", () => {
        queueMicrotask(synchronize);
    });

    synchronize();
})();
