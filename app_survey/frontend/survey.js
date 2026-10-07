// File: app_survey/frontend/survey.js
// Version: 2026.10.06-04
// Status: DEVELOPMENT

"use strict";

const API_URL = new URL("api/", window.location.href);
const byId = id => document.getElementById(id);

const types = {
    text: "Kort text",
    textarea: "Lång text",
    select: "Rullista",
    radio: "Radioknappar – ett val",
    checkbox: "Kryssrutor – flera val",
    number: "Tal",
    date: "Datum",
    sum: "Summafält"
};

const choiceTypes = ["select", "radio", "checkbox"];
const validId = /^[A-Za-z][A-Za-z0-9_]*$/;
const numberFormat = new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2
});

let questions = [];
let currentSurveyId = null;
let currentVersion = null;
let dirty = false;
let busy = false;

function setStatus(message, error = false) {
    byId("status").textContent = message;
    byId("status").classList.toggle("error", error);
}

function markDirty() {
    dirty = true;
}

function canReplaceEditor() {
    if (busy) return false;
    return !dirty || window.confirm(
        "Du har osparade ändringar. Vill du lämna dem?"
    );
}

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function actionButton(text, callback, className = "secondary") {
    const button = element("button", text, className);
    button.type = "button";
    button.addEventListener("click", callback);
    return button;
}

function labeledControl(parent, labelText, control) {
    const label = element("label", labelText);
    label.htmlFor = control.id;
    parent.append(label, control);
}

function checkControl(parent, text, checked, onChange) {
    const label = element("label", undefined, "check-label");
    const input = element("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked));
    label.append(input, document.createTextNode(text));
    parent.append(label);
    return input;
}

function newQuestion() {
    return {
        id: `q_${crypto.randomUUID().replaceAll("-", "")}`,
        label: "",
        type: "textarea",
        required: false,
        help: "",
        options: [],
        sources: [],
        hidden: false
    };
}

function questionHeading(question, index) {
    return `${index + 1}. ${question.label.trim() || "Ny fråga"}` +
        (question.type === "sum" && question.hidden
            ? " · Dolt för respondenten"
            : "");
}

function renderSourcePicker(container, question) {
    container.replaceChildren();

    const fieldset = element("fieldset");
    fieldset.append(element("legend", "Välj talfält att summera"));

    const available = questions
        .map((candidate, index) => ({ candidate, index }))
        .filter(({ candidate }) => candidate.type === "number");

    if (!available.length) {
        fieldset.append(element(
            "p",
            "Lägg till minst ett talfält för att kunna välja en källa.",
            "muted"
        ));
    }

    for (const { candidate, index } of available) {
        checkControl(
            fieldset,
            `Fråga ${index + 1} – ${candidate.label.trim() || "Utan rubrik"}`,
            question.sources.includes(candidate.id),
            checked => {
                if (checked) {
                    if (!question.sources.includes(candidate.id)) {
                        question.sources.push(candidate.id);
                    }
                } else {
                    question.sources = question.sources
                        .filter(source => source !== candidate.id);
                }
                markDirty();
            }
        );
    }

    const missing = question.sources.filter(source =>
        !questions.some(candidate =>
            candidate.id === source && candidate.type === "number"
        )
    );

    for (const source of missing) {
        const row = element("div");
        row.append(element(
            "p",
            "Ett tidigare valt talfält har tagits bort eller bytt svarstyp.",
            "field-error"
        ));
        row.append(actionButton("Ta bort kopplingen", () => {
            question.sources = question.sources
                .filter(value => value !== source);
            markDirty();
            renderQuestionEditor();
        }, "danger"));
        fieldset.append(row);
    }

    container.append(fieldset);
}

function refreshSourcePickers() {
    questions.forEach((question, index) => {
        if (question.type !== "sum") return;
        const container = byId(`editor_sources_${index}`);
        if (container) renderSourcePicker(container, question);
    });
}

function renderQuestionEditor() {
    const container = byId("questionEditor");
    container.replaceChildren();

    questions.forEach((question, index) => {
        const card = element("div", undefined, "question-card");
        const heading = element("div", undefined, "question-heading");
        const headingTitle = element("h3", questionHeading(question, index));
        const controls = element("div", undefined, "question-controls");

        const up = actionButton("↑", () => {
            [questions[index - 1], questions[index]] =
                [questions[index], questions[index - 1]];
            markDirty();
            renderQuestionEditor();
        });
        up.title = "Flytta frågan upp";
        up.disabled = index === 0;

        const down = actionButton("↓", () => {
            [questions[index], questions[index + 1]] =
                [questions[index + 1], questions[index]];
            markDirty();
            renderQuestionEditor();
        });
        down.title = "Flytta frågan ner";
        down.disabled = index === questions.length - 1;

        const remove = actionButton("Ta bort", () => {
            if (!window.confirm("Ta bort frågan?")) return;
            questions.splice(index, 1);
            markDirty();
            renderQuestionEditor();
        }, "danger");

        controls.append(up, down, remove);
        heading.append(headingTitle, controls);
        card.append(heading);

        const labelInput = element("input");
        labelInput.id = `editor_label_${index}`;
        labelInput.type = "text";
        labelInput.maxLength = 500;
        labelInput.placeholder = "Skriv frågans rubrik";
        labelInput.value = question.label;
        labelInput.addEventListener("input", () => {
            question.label = labelInput.value;
            headingTitle.textContent = questionHeading(question, index);
            markDirty();
            refreshSourcePickers();
        });
        labeledControl(card, "Rubrik", labelInput);

        const typeSelect = element("select");
        typeSelect.id = `editor_type_${index}`;

        for (const [value, title] of Object.entries(types)) {
            const option = element("option", title);
            option.value = value;
            typeSelect.append(option);
        }

        typeSelect.value = question.type;
        typeSelect.addEventListener("change", () => {
            question.type = typeSelect.value;
            if (question.type === "sum") question.required = false;
            markDirty();
            renderQuestionEditor();
        });
        labeledControl(card, "Svarstyp", typeSelect);

        if (question.type !== "sum") {
            checkControl(
                card,
                "Obligatorisk fråga",
                question.required,
                checked => {
                    question.required = checked;
                    markDirty();
                }
            );
        } else {
            checkControl(
                card,
                "Dölj för respondenten",
                question.hidden,
                checked => {
                    question.hidden = checked;
                    headingTitle.textContent = questionHeading(question, index);
                    markDirty();
                }
            );
        }

        const helpInput = element("textarea");
        helpInput.id = `editor_help_${index}`;
        helpInput.rows = 2;
        helpInput.maxLength = 1000;
        helpInput.placeholder = "Förklara hur frågan ska besvaras";
        helpInput.value = question.help;
        helpInput.addEventListener("input", () => {
            question.help = helpInput.value;
            markDirty();
        });
        labeledControl(card, "Hjälptext", helpInput);

        if (choiceTypes.includes(question.type)) {
            const optionsInput = element("textarea");
            optionsInput.id = `editor_options_${index}`;
            optionsInput.rows = 4;
            optionsInput.placeholder = "Alternativ ett\nAlternativ två";
            optionsInput.value = question.options.join("\n");
            optionsInput.addEventListener("input", () => {
                question.options = optionsInput.value.split("\n");
                markDirty();
            });
            labeledControl(
                card, "Svarsalternativ – ett per rad", optionsInput
            );
        }

        if (question.type === "sum") {
            const picker = element("div");
            picker.id = `editor_sources_${index}`;
            card.append(picker);
            renderSourcePicker(picker, question);

            card.append(element(
                "p",
                "Tomma talfält lämnar summan tom. " +
                "Resultatet visas med högst två decimaler.",
                "muted"
            ));
        }

        container.append(card);
    });
}

function buildForm() {
    const title = byId("surveyTitle").value.trim();
    const introduction = byId("surveyIntroduction").value.trim();

    if (!title || title.length > 200) {
        throw new Error("Formulärets rubrik ska innehålla 1–200 tecken.");
    }
    if (introduction.length > 5000) {
        throw new Error("Introduktionen är för lång.");
    }
    if (!questions.length || questions.length > 100) {
        throw new Error("Formuläret behöver 1–100 frågor.");
    }

    const ids = new Set();

    const resultQuestions = questions.map((question, index) => {
        const id = question.id;
        const label = question.label.trim();
        const help = question.help.trim();
        const choices = choiceTypes.includes(question.type);

        if (!validId.test(id) || id.length > 64 || ids.has(id)) {
            throw new Error(
                `Fråga ${index + 1}: ogiltig intern koppling.`
            );
        }
        ids.add(id);

        if (!Object.hasOwn(types, question.type)) {
            throw new Error(`Fråga ${index + 1}: okänd svarstyp.`);
        }
        if (!label || label.length > 500) {
            throw new Error(
                `Fråga ${index + 1}: rubriken ska innehålla 1–500 tecken.`
            );
        }
        if (help.length > 1000) {
            throw new Error(`Fråga ${index + 1}: hjälptexten är för lång.`);
        }

        const options = choices
            ? question.options.map(value => value.trim()).filter(Boolean)
            : [];

        if (choices && (
            options.length < 2 ||
            options.length > 50 ||
            options.some(value => value.length > 300) ||
            new Set(options).size !== options.length
        )) {
            throw new Error(
                `Fråga ${index + 1}: ange 2–50 unika alternativ, ` +
                "högst 300 tecken per alternativ."
            );
        }

        const result = {
            id,
            label,
            type: question.type,
            required: question.type === "sum" ? false : question.required,
            help,
            options
        };

        if (question.type === "sum") {
            const sources = [...question.sources];

            if (!sources.length ||
                new Set(sources).size !== sources.length) {
                throw new Error(
                    `Summafältet "${label}": välj minst ett talfält.`
                );
            }

            result.sources = sources;
            result.hidden = Boolean(question.hidden);
        }

        return result;
    });

    const lookup = new Map(
        resultQuestions.map(question => [question.id, question])
    );

    for (const question of resultQuestions) {
        if (question.type !== "sum") continue;

        for (const source of question.sources) {
            if (lookup.get(source)?.type !== "number") {
                throw new Error(
                    `Summafältet "${question.label}" har en koppling till ` +
                    "ett borttaget fält eller ett fält som inte längre är Tal. " +
                    "Ändra dess val."
                );
            }
        }
    }

    return {
        schema_version: 1,
        title,
        introduction,
        questions: resultQuestions
    };
}

function renderPreview(form) {
    const container = byId("formPreview");
    container.replaceChildren();
    container.append(element("h3", form.title));

    const introduction = element("p", form.introduction);
    introduction.style.whiteSpace = "pre-wrap";
    container.append(introduction);

    const previewForm = element("form");
    const numberInputs = new Map();
    const sumControls = [];
    let visibleNumber = 0;

    form.questions.forEach(question => {
        // Dolda beräkningar ska inte finnas i respondentens formulär.
        if (question.type === "sum" && question.hidden) return;

        visibleNumber++;
        const block = element("div", undefined, "preview-question");
        const title = `${visibleNumber}. ${question.label}` +
            (question.required ? " *" : "");
        const controlId = `preview_${visibleNumber}`;

        if (["radio", "checkbox"].includes(question.type)) {
            const fieldset = element("fieldset");
            fieldset.append(element("legend", title));

            if (question.help) {
                fieldset.append(element("p", question.help, "muted"));
            }

            question.options.forEach(option => {
                const label = element("label", undefined, "choice-label");
                const input = element("input");
                input.type = question.type;
                input.name = question.id;
                input.value = option;
                input.required =
                    question.type === "radio" && question.required;
                label.append(input, document.createTextNode(option));
                fieldset.append(label);
            });

            block.append(fieldset);
        } else {
            let input;

            if (question.type === "textarea") {
                input = element("textarea");
                input.rows = 4;
            } else if (question.type === "select") {
                input = element("select");
                const empty = element("option", "Välj ett alternativ");
                empty.value = "";
                input.append(empty);

                question.options.forEach(value => {
                    const option = element("option", value);
                    option.value = value;
                    input.append(option);
                });
            } else {
                input = element("input");
                input.type = question.type === "sum" ? "text" : question.type;

                if (question.type === "number") {
                    input.step = "any";
                    numberInputs.set(question.id, input);
                }

                if (question.type === "sum") {
                    input.readOnly = true;
                    input.placeholder = "Fyll i talfälten för att se summan";
                }
            }

            input.id = controlId;
            input.name = question.id;
            input.required = question.type !== "sum" && question.required;
            labeledControl(block, title, input);

            const describedBy = [];

            if (question.help) {
                const help = element("p", question.help, "muted");
                help.id = `${controlId}_help`;
                describedBy.push(help.id);
                block.append(help);
            }

            if (question.type === "sum") {
                const error = element("p", "", "field-error");
                error.id = `${controlId}_error`;
                error.setAttribute("aria-live", "polite");
                describedBy.push(error.id);
                block.append(error);
                sumControls.push({ question, input, error });
            }

            if (describedBy.length) {
                input.setAttribute("aria-describedby", describedBy.join(" "));
            }
        }

        previewForm.append(block);
    });

    function updateSums() {
        for (const { question, input, error } of sumControls) {
            let total = 0;
            let incomplete = false;
            let invalid = false;

            for (const source of question.sources) {
                const sourceInput = numberInputs.get(source);

                if (!sourceInput || sourceInput.validity.badInput) {
                    invalid = true;
                    break;
                }
                if (sourceInput.value === "") {
                    incomplete = true;
                    continue;
                }

                const value = sourceInput.valueAsNumber;
                if (!Number.isFinite(value)) {
                    invalid = true;
                    break;
                }
                total += value;
            }

            if (!Number.isFinite(total)) invalid = true;

            input.value = invalid || incomplete
                ? ""
                : numberFormat.format(Object.is(total, -0) ? 0 : total);

            input.setAttribute("aria-invalid", String(invalid));
            error.textContent = invalid
                ? "Summan kan inte beräknas. Kontrollera talfälten."
                : "";
        }
    }

    previewForm.addEventListener("input", updateSums);

    const testButton = element("button", "Prova formuläret");
    testButton.type = "submit";
    previewForm.append(testButton);

    previewForm.addEventListener("submit", event => {
        event.preventDefault();
        updateSums();

        for (const question of form.questions) {
            if (question.type !== "checkbox" || !question.required) continue;

            const inputs = Array.from(
                previewForm.querySelectorAll('input[type="checkbox"]')
            ).filter(input => input.name === question.id);

            if (!inputs.some(input => input.checked)) {
                setStatus(
                    `Välj minst ett alternativ för: ${question.label}`,
                    true
                );
                inputs[0]?.focus();
                return;
            }
        }

        // Summafält ställer inga extra krav på frivilliga talfält.
        // Tomma källvärden ger en tom summa.
        if (sumControls.some(({ input }) =>
            input.getAttribute("aria-invalid") === "true"
        )) {
            setStatus("Kontrollera talfälten för beräkningarna.", true);
            return;
        }

        setStatus("Formuläret fungerar. Detta testsvar sparas inte.");
    });

    updateSums();
    container.append(previewForm);
}

function showPreview() {
    try {
        renderPreview(buildForm());
        setStatus("Förhandsgranskningen är uppdaterad.");
    } catch (error) {
        setStatus(error.message, true);
    }
}

function setEditor(name, form, surveyId = null, version = null, closesOn = "") {
    byId("surveyName").value = name;
    byId("surveyClosesOn").value = closesOn || "";
    byId("surveyTitle").value = form.title;
    byId("surveyIntroduction").value = form.introduction || "";

    questions = structuredClone(form.questions).map(question => ({
        ...question,
        help: question.help || "",
        options: question.options || [],
        sources: question.sources || [],
        hidden: Boolean(question.hidden)
    }));

    currentSurveyId = surveyId;
    currentVersion = version;
    dirty = false;

    byId("versionInfo").textContent = version
        ? `Sparad version: ${version}`
        : "Ny undersökning – ännu inte sparad.";

    renderQuestionEditor();
    byId("formPreview").replaceChildren();
}

function startNew() {
    if (!canReplaceEditor()) return;

    setEditor("", {
        title: "",
        introduction: "",
        questions: [newQuestion()]
    });
    setStatus("Ny undersökning.");
}

function loadTemplate() {
    if (!canReplaceEditor()) return;

    const definitions = [
        ["frustration", "Vad är den mest frustrerande delen av er process?"],
        ["waste", "Vilka moment känns som slöseri med tid?"],
        ["critical", "Vilken del är mest kritisk – men också mest sårbar?"],
        ["errors", "Finns det återkommande fel eller missförstånd?"],
        ["unused_data", "Samlar ni in data som inte används?"],
        ["feedback_time", "Hur snabbt får ni veta om något gått fel?"],
        ["accounting", "Hur sker er redovisning idag?"],
        ["erp_system", "Vilket affärssystem använder ni?"]
    ];

    const templateQuestions = definitions.map(([id, label]) => ({
        id,
        label,
        type: id === "feedback_time"
            ? "select"
            : id === "erp_system" ? "text" : "textarea",
        required: id === "frustration",
        help: "",
        options: id === "feedback_time"
            ? ["Omedelbart", "Inom timmar", "Inom dagar", "Aldrig riktigt säkert"]
            : [],
        sources: [],
        hidden: false
    }));

    setEditor("", {
        title: "",
        introduction: "",
        questions: templateQuestions
    });

    dirty = true;
    setStatus("Mallen är laddad. Ange huvudfält och förhandsgranska.");
}

async function apiFetch(path, options = {}) {
    const token = sessionStorage.getItem("authToken");

    if (!token) {
        throw new Error(
            "Logga in via MySupportNet för att hämta eller spara undersökningar."
        );
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(
        new URL(path, API_URL),
        { ...options, headers }
    );

    const text = await response.text();
    let data;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        throw new Error(`Oväntat serversvar: HTTP ${response.status}.`);
    }

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Inloggningen saknas eller har gått ut.");
        }
        if (response.status === 403) {
            throw new Error("Åtkomst till Survey saknas.");
        }

        const detail = typeof data?.detail === "string"
            ? data.detail
            : `HTTP ${response.status}`;

        throw new Error(detail);
    }

    return data;
}

let showHiddenSurveys = false;
let surveyListRequest = 0;

const showHiddenSurveysButton = actionButton("Visa dolda", async () => {
    if (busy) return;

    showHiddenSurveys = !showHiddenSurveys;
    showHiddenSurveysButton.textContent = showHiddenSurveys
        ? "Dölj dolda"
        : "Visa dolda";
    showHiddenSurveysButton.setAttribute(
        "aria-pressed",
        String(showHiddenSurveys)
    );

    try {
        await refreshList();
    } catch (error) {
        setStatus(error.message, true);
    }
}, "secondary");

showHiddenSurveysButton.setAttribute("aria-pressed", "false");
byId("refreshButton").parentElement.append(showHiddenSurveysButton);

async function changeSurveyVisibility(survey, hidden) {
    if (busy) return;

    const active = currentSurveyId === survey.survey_id;

    if (hidden && active && !canReplaceEditor()) return;

    if (hidden && !window.confirm(
        `Dölj ${survey.name}? Svar, länkar och historik finns kvar. ` +
        "Undersökningen kan hämtas med Visa dolda."
    )) return;

    busy = true;

    try {
        await apiFetch(
            `surveys/${encodeURIComponent(survey.survey_id)}/` +
            (hidden ? "hide" : "restore"),
            { method: "POST" }
        );

        if (hidden && active) {
            setEditor("", {
                title: "",
                introduction: "",
                questions: [newQuestion()]
            });
        }

        await refreshList();

        setStatus(hidden
            ? "Undersökningen är dold. Befintliga länkar fungerar fortfarande."
            : "Undersökningen visas igen."
        );
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        busy = false;
    }
}

async function refreshList() {
    const request = ++surveyListRequest;

    const surveys = await apiFetch(
        `surveys?include_hidden=${showHiddenSurveys}`
    );

    if (request !== surveyListRequest) return;

    const container = byId("surveyList");
    container.replaceChildren();

    if (!surveys.length) {
        container.append(element("p", "Inga undersökningar att visa."));
        return;
    }

    for (const survey of surveys) {
        const row = element("div", undefined, "survey-list-row");
        row.classList.toggle("is-hidden", Boolean(survey.hidden_at));

        const button = actionButton(
            `${survey.name} · version ${survey.version}` +
            (survey.hidden_at ? " · Dold" : ""),
            () => openSurvey(survey.survey_id),
            "secondary survey-item"
        );

        button.dataset.surveyId = survey.survey_id;

        const visibility = actionButton(
            survey.hidden_at ? "Visa igen" : "×",
            () => changeSurveyVisibility(survey, !survey.hidden_at),
            "secondary"
        );

        visibility.setAttribute(
            "aria-label",
            `${survey.hidden_at ? "Visa igen" : "Dölj"}: ${survey.name}`
        );

        visibility.title = survey.hidden_at
            ? "Visa undersökningen igen"
            : "Dölj undersökningen";

        row.append(button, visibility);
        container.append(row);
    }
}

async function openSurvey(surveyId) {
    if (!canReplaceEditor()) return;
    busy = true;

    try {
        const survey = await apiFetch(
            `surveys/${encodeURIComponent(surveyId)}`
        );

        setEditor(
            survey.name,
            survey.form,
            survey.survey_id,
            survey.version,
            survey.closes_on
        );

        renderPreview(survey.form);
        setStatus("Undersökningen är öppnad.");
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        busy = false;
    }
}

async function saveSurvey() {
    if (busy) return;

    let payload;

    try {
        const name = byId("surveyName").value.trim();

        if (!name || name.length > 200) {
            throw new Error("Namnet ska innehålla 1–200 tecken.");
        }

        const closesOn = byId("surveyClosesOn").value;

        const parts = new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Europe/Stockholm",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        const part = type => parts.find(item => item.type === type).value;
        const today = `${part("year")}-${part("month")}-${part("day")}`;

        if (!closesOn || !byId("surveyClosesOn").checkValidity()) {
            throw new Error("Ange en giltig sista svarsdag.");
        }

        if (closesOn < today) {
            throw new Error("Sista svarsdag får inte vara före dagens datum.");
        }

        payload = {
            name,
            closes_on: closesOn,
            form: buildForm()
        };
    } catch (error) {
        setStatus(error.message, true);
        return;
    }

    busy = true;

    const editorPanel = byId("surveyName").closest(".panel");
    const controls = Array.from(
        editorPanel.querySelectorAll("input, textarea, select, button")
    );
    const states = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });

    try {
        const updating = currentSurveyId !== null;
        if (updating) payload.expected_version = currentVersion;

        const saved = await apiFetch(
            updating
                ? `surveys/${encodeURIComponent(currentSurveyId)}`
                : "surveys",
            {
                method: updating ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }
        );

        currentSurveyId = saved.survey_id;
        currentVersion = saved.version;
        dirty = false;

        byId("versionInfo").textContent =
            `Sparad version: ${saved.version}`;

        renderPreview(saved.form);
        setStatus(`Undersökningen är sparad som version ${saved.version}.`);

        try {
            await refreshList();
        } catch (error) {
            setStatus(
                `Sparad version ${saved.version}, men listan kunde inte ` +
                `uppdateras: ${error.message}`,
                true
            );
        }
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        controls.forEach((control, index) => {
            control.disabled = states[index];
        });
        busy = false;
    }
}

function exportJson() {
    try {
        const form = buildForm();

        const data = {
            name: byId("surveyName").value.trim(),
            closes_on: byId("surveyClosesOn").value || null,
            form
        };

        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = element("a");
        link.href = url;
        link.download = "survey-form.json";
        document.body.append(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus("JSON-filen är hämtad.");
    } catch (error) {
        setStatus(error.message, true);
    }
}

byId("helpButton").addEventListener("click", () => {
    byId("helpDialog").showModal();
});

byId("closeHelpButton").addEventListener("click", () => {
    byId("helpDialog").close();
});

byId("newButton").addEventListener("click", startNew);
byId("templateButton").addEventListener("click", loadTemplate);
byId("previewButton").addEventListener("click", showPreview);
byId("saveButton").addEventListener("click", saveSurvey);
byId("exportButton").addEventListener("click", exportJson);

byId("addQuestionButton").addEventListener("click", () => {
    if (busy) return;

    if (questions.length >= 100) {
        setStatus("Högst 100 frågor per formulär.", true);
        return;
    }

    questions.push(newQuestion());
    markDirty();
    renderQuestionEditor();
});

byId("refreshButton").addEventListener("click", async () => {
    try {
        await refreshList();
        setStatus("Listan är uppdaterad.");
    } catch (error) {
        setStatus(error.message, true);
    }
});

[
    "surveyName",
    "surveyClosesOn",
    "surveyTitle",
    "surveyIntroduction"
].forEach(id => {
    byId(id).addEventListener("input", markDirty);
});

byId("dashboardButton").addEventListener("click", () => {
    if (!canReplaceEditor()) return;
    window.location.href = "/user/pages/userDashboard.html";
});

byId("logoutButton").addEventListener("click", () => {
    if (!canReplaceEditor()) return;
    sessionStorage.clear();
    window.location.replace("/user/auth/userLogin.html");
});

window.addEventListener("beforeunload", event => {
    if (!dirty && !busy) return;
    event.preventDefault();
    event.returnValue = "";
});

startNew();

if (sessionStorage.getItem("authToken")) {
    refreshList().catch(error => setStatus(error.message, true));
} else {
    setStatus(
        "Du kan bygga, förhandsgranska och hämta JSON lokalt. " +
        "Inloggning krävs för att spara i databasen."
    );
}
