"use strict";

const notesHelpButton = document.getElementById("helpButton");
const notesHelpDialog = document.getElementById("helpDialog");
const notesCloseHelpButton = document.getElementById("closeHelpButton");

notesHelpButton.addEventListener("click", () => {
    if (!notesHelpDialog.open) {
        notesHelpDialog.showModal();
    }
});

notesCloseHelpButton.addEventListener("click", () => {
    notesHelpDialog.close();
});
