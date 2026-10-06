// File: app_survey/frontend/accordion.js
// Version: 2026.10.06-01
// Status: DEVELOPMENT

"use strict";

(() => {
    const get = id => document.getElementById(id);

    function openBuilder() {
        get("builderAccordion").open = true;
    }

    function updateHeadings() {
        document.querySelectorAll("#surveyList [data-survey-id]").forEach(button => {
            const selected = button.dataset.surveyId === currentSurveyId;
            button.classList.toggle("selected-survey", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        const name = get("surveyName").value.trim();
        get("builderSummary").textContent = name || "Ny undersökning";

        const count = get("questionEditor")
            .querySelectorAll(".question-card").length;
        get("questionCount").textContent = `${count} frågor`;

        const respondents = get("invitationList")
            .querySelectorAll(".respondent-row");
        const answered = Array.from(respondents).filter(
            row => row.dataset.status === "ANSWERED"
        ).length;

        get("respondentCount").textContent = currentSurveyId
            ? `${respondents.length} respondenter · ${answered} besvarade`
            : "";
    }

    function startEditing() {
        if (busy) return;
        openBuilder();
        get("headAccordion").open = true;
        get("questionsAccordion").open = false;
        get("previewAccordion").open = false;
        updateHeadings();
    }

    get("newButton").addEventListener("click", startEditing);
    get("templateButton").addEventListener("click", startEditing);

    get("previewButton").addEventListener("click", () => {
        if (get("formPreview").querySelector("form")) {
            get("previewAccordion").open = true;
        }
    });

    get("addQuestionButton").addEventListener("click", () => {
        openBuilder();
        get("questionsAccordion").open = true;
    });

    get("surveyName").addEventListener("input", updateHeadings);

    new MutationObserver(() => {
        openBuilder();
        updateHeadings();
    }).observe(get("versionInfo"), {
        childList: true,
        characterData: true,
        subtree: true
    });

    new MutationObserver(updateHeadings).observe(
        get("questionEditor"), { childList: true }
    );

    new MutationObserver(updateHeadings).observe(
        get("invitationList"), { childList: true }
    );

    new MutationObserver(updateHeadings).observe(
        get("surveyList"), { childList: true }
    );

    // Felmeddelanden i byggaren ska alltid vara synliga.
    new MutationObserver(() => {
        if (get("status").classList.contains("error")) {
            openBuilder();
            get("headAccordion").open = true;
            get("questionsAccordion").open = true;
        }
    }).observe(get("status"), {
        childList: true,
        attributes: true,
        attributeFilter: ["class"]
    });

    updateHeadings();
})();
