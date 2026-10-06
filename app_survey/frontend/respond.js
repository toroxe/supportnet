// File: app_survey/frontend/respond.js
// Version: 2026.10.06-01
// Status: DEVELOPMENT

"use strict";

(() => {
    const get = id => document.getElementById(id);
    const formElement = get("responseForm");
    const controls = new Map();
    const sums = [];
    const token = new URLSearchParams(
        window.location.hash.slice(1)
    ).get("token");

    const endpoint = new URL("api/participate", window.location.href);
    const numberFormat = new Intl.NumberFormat("sv-SE", {
        maximumFractionDigits: 2
    });

    let definition = null;
    let changed = false;
    let sending = false;
    let completed = false;

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function status(message, error = false) {
        get("responseStatus").textContent = message;
        get("responseStatus").classList.toggle("error", error);
    }

    async function request(options = {}) {
        const url = new URL(endpoint);
        url.searchParams.set("token", token);

        const response = await fetch(url, {
            ...options,
            cache: "no-store",
            credentials: "omit",
            referrerPolicy: "no-referrer"
        });

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error(`Oväntat serversvar: HTTP ${response.status}.`);
        }

        if (!response.ok) {
            const message = typeof data?.detail === "string"
                ? data.detail
                : "Svaret kunde inte behandlas. Kontrollera fälten.";
            throw new Error(message);
        }

        return data;
    }

    function render(form) {
        const container = get("responseQuestions");
        container.replaceChildren();
        controls.clear();
        sums.length = 0;

        get("responseTitle").textContent = form.title;
        get("responseIntroduction").textContent = form.introduction || "";
        document.title = `${form.title} | MySupportNet`;

        form.questions.forEach((question, index) => {
            const block = element("div", undefined, "preview-question");
            const title = `${index + 1}. ${question.label}` +
                (question.required ? " *" : "");
            const controlId = `answer_${index + 1}`;

            if (question.type === "radio" || question.type === "checkbox") {
                const fieldset = element("fieldset");
                fieldset.append(element("legend", title));

                if (question.help) {
                    fieldset.append(element("p", question.help, "muted"));
                }

                const inputs = [];

                question.options.forEach((option, optionIndex) => {
                    const label = element(
                        "label", undefined, "choice-label"
                    );
                    const input = element("input");
                    input.id = `${controlId}_${optionIndex}`;
                    input.type = question.type;
                    input.name = question.id;
                    input.value = option;
                    input.required =
                        question.type === "radio" && question.required;
                    label.append(input, document.createTextNode(option));
                    fieldset.append(label);
                    inputs.push(input);
                });

                controls.set(question.id, inputs);
                block.append(fieldset);
            } else {
                let input;

                if (question.type === "textarea") {
                    input = element("textarea");
                    input.rows = 4;
                    input.maxLength = 10000;
                } else if (question.type === "select") {
                    input = element("select");
                    const empty = element("option", "Välj ett alternativ");
                    empty.value = "";
                    input.append(empty);

                    for (const value of question.options) {
                        const option = element("option", value);
                        option.value = value;
                        input.append(option);
                    }
                } else {
                    input = element("input");
                    input.type = question.type === "sum"
                        ? "text"
                        : question.type;

                    if (question.type === "text") {
                        input.maxLength = 10000;
                    }
                    if (question.type === "number") {
                        input.step = "any";
                    }
                    if (question.type === "sum") {
                        input.readOnly = true;
                        input.placeholder = "Fyll i talfälten för att se summan";
                        sums.push({ question, input });
                    }
                }

                input.id = controlId;
                input.name = question.id;
                input.required =
                    question.type !== "sum" && question.required;

                const label = element("label", title);
                label.htmlFor = controlId;
                block.append(label, input);

                if (question.help) {
                    const help = element("p", question.help, "muted");
                    help.id = `${controlId}_help`;
                    input.setAttribute("aria-describedby", help.id);
                    block.append(help);
                }

                controls.set(question.id, input);
            }

            container.append(block);
        });

        get("responseInstructions").hidden = false;
        formElement.hidden = false;
        updateSums();
    }

    function updateSums() {
        for (const { question, input } of sums) {
            let total = 0;
            let complete = true;

            for (const source of question.sources) {
                const control = controls.get(source);
                const value = control?.valueAsNumber;

                if (
                    !control ||
                    control.value === "" ||
                    !Number.isFinite(value) ||
                    control.validity.badInput
                ) {
                    complete = false;
                    break;
                }

                total += value;
            }

            input.value = complete && Number.isFinite(total)
                ? numberFormat.format(Object.is(total, -0) ? 0 : total)
                : "";
        }
    }

    function collectAnswers() {
        const answers = {};

        for (const question of definition.questions) {
            if (question.type === "sum") continue;

            const control = controls.get(question.id);

            if (question.type === "checkbox") {
                const selected = control
                    .filter(input => input.checked)
                    .map(input => input.value);

                if (question.required && !selected.length) {
                    control[0]?.focus();
                    throw new Error(
                        `Välj minst ett alternativ för: ${question.label}`
                    );
                }
                answers[question.id] = selected;
            } else if (question.type === "radio") {
                answers[question.id] =
                    control.find(input => input.checked)?.value || null;
            } else {
                if (question.type === "number" && control.validity.badInput) {
                    control.focus();
                    throw new Error(
                        `Ange ett giltigt tal för: ${question.label}`
                    );
                }

                answers[question.id] = control.value.trim() || null;
            }
        }

        return answers;
    }

    formElement.addEventListener("input", () => {
        changed = true;
        updateSums();
    });

    formElement.addEventListener("change", () => {
        changed = true;
        updateSums();
    });

    formElement.addEventListener("submit", async event => {
        event.preventDefault();
        if (sending || completed || !definition) return;
        if (!formElement.reportValidity()) return;

        let answers;
        try {
            answers = collectAnswers();
        } catch (error) {
            status(error.message, true);
            return;
        }

        sending = true;
        const inputs = Array.from(
            formElement.querySelectorAll("input, textarea, select, button")
        );
        const previous = inputs.map(input => input.disabled);
        inputs.forEach(input => { input.disabled = true; });
        status("Skickar svaret…");

        try {
            const result = await request({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers })
            });

            completed = true;
            changed = false;
            formElement.hidden = true;
            get("responseInstructions").hidden = true;
            get("responseIntroduction").textContent = "";
            get("responseTitle").textContent = "Tack för ditt svar!";
            status(result.message);

            // Ta bort den personliga länken från adressfältet efter svar.
            history.replaceState(
                null, "", window.location.pathname + window.location.search
            );
        } catch (error) {
            status(
                `${error.message} Dina ifyllda svar finns kvar på sidan.`,
                true
            );
        } finally {
            sending = false;
            if (!completed) {
                inputs.forEach((input, index) => {
                    input.disabled = previous[index];
                });
            }
        }
    });

    window.addEventListener("beforeunload", event => {
        if (completed || (!changed && !sending)) return;
        event.preventDefault();
        event.returnValue = "";
    });

    async function initialize() {
        if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
            get("responseTitle").textContent = "Personlig länk saknas";
            status("Öppna hela länken som du fick till undersökningen.", true);
            return;
        }

        try {
            const result = await request();
            definition = result.form;
            render(definition);
            status("");
        } catch (error) {
            get("responseTitle").textContent = "Undersökningen kunde inte öppnas";
            status(error.message, true);
        }
    }

    initialize();
})();
