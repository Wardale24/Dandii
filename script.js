const DANDII_OFFLINE_MESSAGE = "Dandii is offline. Please try again.";
const DANDII_THINKING_MESSAGE = "Dandii is thinking...";
const DANDII_THEME_STORAGE_KEY = "dandii-theme";

const state = {
  currentQuestion: "",
  submittedQuestion: "",
  lastAnswer: "",
  isWaiting: false,
  isTypingAnswer: false,
  maxCharacters: 1200,
  typewriterTimer: null,
  copyResetTimer: null
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  elements.stage = document.getElementById("stage");
  elements.bubbleStack =
    document.getElementById("bubble-stack") ||
    document.querySelector(".bubble-stack");

  elements.composer = document.getElementById("composer");
  elements.questionInput = document.getElementById("question-input");

  elements.questionRow = document.getElementById("question-row");
  elements.questionBubble = document.getElementById("question-bubble");

  elements.answerRow = document.getElementById("answer-row");
  elements.answerBubble = document.getElementById("answer-bubble");

  elements.sendButton = document.getElementById("send-button");
  elements.copyButton = document.getElementById("copy-button");
  elements.resetButton = document.getElementById("reset-button");

  elements.themeToggle = document.getElementById("theme-toggle");
  elements.themeMoon = document.getElementById("theme-moon");
  elements.themeSun = document.getElementById("theme-sun");

  elements.composer.addEventListener("submit", handleSubmit);
  elements.questionInput.addEventListener("input", handleQuestionInput);
  elements.questionInput.addEventListener("keydown", handleQuestionKeydown);

  if (elements.copyButton) {
    elements.copyButton.addEventListener("click", copyLastAnswer);
  }

  if (elements.resetButton) {
    elements.resetButton.addEventListener("click", clearEverything);
  }

  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", toggleTheme);
  }

  document.addEventListener("keydown", handleDocumentKeydown);

  initialiseTheme();
  resetInterface();
  elements.questionInput.focus();
});

function initialiseTheme() {
  let theme = "dark";

  try {
    const savedTheme = localStorage.getItem(DANDII_THEME_STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      theme = savedTheme;
    }
  } catch (error) {
    console.warn("Could not read saved Dandii theme:", error);
  }

  applyTheme(theme, false);
}

function toggleTheme() {
  const currentTheme =
    document.documentElement.dataset.theme === "light"
      ? "light"
      : "dark";

  const nextTheme =
    currentTheme === "dark"
      ? "light"
      : "dark";

  applyTheme(nextTheme, true);
}

function applyTheme(theme, saveTheme = true) {
  const isLight = theme === "light";

  document.documentElement.dataset.theme =
    isLight ? "light" : "dark";

  if (elements.themeMoon) {
    elements.themeMoon.classList.toggle("active", !isLight);
  }

  if (elements.themeSun) {
    elements.themeSun.classList.toggle("active", isLight);
  }

  if (elements.themeToggle) {
    const label =
      isLight
        ? "Switch to dark mode"
        : "Switch to light mode";

    elements.themeToggle.setAttribute("aria-label", label);
    elements.themeToggle.setAttribute("title", label);
    elements.themeToggle.setAttribute(
      "aria-pressed",
      String(isLight)
    );
  }

  if (saveTheme) {
    try {
      localStorage.setItem(
        DANDII_THEME_STORAGE_KEY,
        isLight ? "light" : "dark"
      );
    } catch (error) {
      console.warn("Could not save Dandii theme:", error);
    }
  }
}

function handleSubmit(event) {
  event.preventDefault();
  submitCurrentQuestion();
}

function handleQuestionInput() {
  state.currentQuestion =
    elements.questionInput.value.slice(
      0,
      state.maxCharacters
    );

  if (
    elements.questionInput.value.length >
    state.maxCharacters
  ) {
    elements.questionInput.value =
      state.currentQuestion;
  }

  resizeQuestionInput();
}

function handleQuestionKeydown(event) {
  if (
    event.key !== "Enter" ||
    event.shiftKey
  ) {
    return;
  }

  event.preventDefault();
  submitCurrentQuestion();
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    clearEverything();
  }
}

function showQuestionBubble(text) {
  elements.questionBubble.textContent = text;

  elements.questionRow.hidden = false;
  elements.questionRow.classList.remove("hidden");

  scrollBubblesToBottom();
}

function hideQuestionBubble() {
  elements.questionBubble.textContent = "";

  elements.questionRow.hidden = true;
  elements.questionRow.classList.add("hidden");
}

function showAnswerBubble(text, options = {}) {
  elements.answerBubble.textContent = text;

  elements.answerBubble.classList.toggle(
    "thinking",
    Boolean(options.thinking)
  );

  elements.answerRow.hidden = false;
  elements.answerRow.classList.remove("hidden");

  scrollBubblesToBottom();
}

function hideAnswerBubble() {
  elements.answerBubble.textContent = "";
  elements.answerBubble.classList.remove("thinking");

  elements.answerRow.hidden = true;
  elements.answerRow.classList.add("hidden");
}

function resetInterface() {
  state.currentQuestion = "";
  state.submittedQuestion = "";
  state.lastAnswer = "";
  state.isWaiting = false;
  state.isTypingAnswer = false;

  hideQuestionBubble();
  hideAnswerBubble();

  setControlsReady();
  resetCopyButtonLabel();
  resizeQuestionInput();
}

function clearEverything() {
  stopTypewriter();

  elements.questionInput.value = "";

  resetInterface();

  elements.questionInput.focus();
}

function clearAnswerOnly() {
  stopTypewriter();

  state.submittedQuestion = "";
  state.lastAnswer = "";

  hideQuestionBubble();
  hideAnswerBubble();

  hideCopyButton();
  resetCopyButtonLabel();
}

async function submitCurrentQuestion() {
  if (
    state.isWaiting ||
    state.isTypingAnswer
  ) {
    return;
  }

  const question =
    elements.questionInput.value.trim();

  if (!question) {
    elements.questionInput.value = "";
    state.currentQuestion = "";

    resizeQuestionInput();

    return;
  }

  state.currentQuestion = "";
  state.submittedQuestion = question;
  state.lastAnswer = "";
  state.isWaiting = true;

  elements.questionInput.value = "";

  resizeQuestionInput();

  showQuestionBubble(question);

  showAnswerBubble(
    DANDII_THINKING_MESSAGE,
    { thinking: true }
  );

  hideCopyButton();
  resetCopyButtonLabel();
  setControlsWaiting();

  try {
    const answer =
      await askDandii(question);

    state.isWaiting = false;

    await typeAnswer(
      answer ||
      DANDII_OFFLINE_MESSAGE
    );
  } catch (error) {
    console.error(
      "Dandii request failed:",
      error
    );

    state.isWaiting = false;

    await typeAnswer(
      DANDII_OFFLINE_MESSAGE
    );
  }
}

async function askDandii(question) {
  const response = await fetch(
    "/api/chat",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        question
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `API returned ${response.status}`
    );
  }

  const data = await response.json();

  return data.answer;
}

function typeAnswer(text) {
  return new Promise((resolve) => {
    state.isTypingAnswer = true;
    state.lastAnswer = text;

    let index = 0;

    const speedMs =
      getTypewriterSpeed(text);

    stopTypewriter();

    showAnswerBubble("");

    state.typewriterTimer =
      window.setInterval(() => {
        index += 1;

        showAnswerBubble(
          text.slice(0, index)
        );

        if (index >= text.length) {
          stopTypewriter();

          state.isTypingAnswer = false;

          setControlsReady();
          showCopyButton();

          resolve();
        }
      }, speedMs);
  });
}

function stopTypewriter() {
  if (state.typewriterTimer) {
    clearInterval(
      state.typewriterTimer
    );

    state.typewriterTimer = null;
  }
}

function getTypewriterSpeed(text) {
  if (text.length > 900) {
    return 4;
  }

  if (text.length > 400) {
    return 7;
  }

  return 11;
}

async function copyLastAnswer() {
  if (
    !state.lastAnswer ||
    !elements.copyButton
  ) {
    return;
  }

  try {
    await copyTextToClipboard(
      state.lastAnswer
    );

    elements.copyButton.textContent =
      "Copied";
  } catch (error) {
    console.error(
      "Copy failed:",
      error
    );

    elements.copyButton.textContent =
      "Copy failed";
  }

  if (state.copyResetTimer) {
    clearTimeout(
      state.copyResetTimer
    );
  }

  state.copyResetTimer =
    window.setTimeout(
      resetCopyButtonLabel,
      1300
    );
}

async function copyTextToClipboard(text) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(
      text
    );

    return;
  }

  const temporaryTextArea =
    document.createElement("textarea");

  temporaryTextArea.value = text;

  temporaryTextArea.setAttribute(
    "readonly",
    ""
  );

  temporaryTextArea.style.position =
    "absolute";

  temporaryTextArea.style.left =
    "-9999px";

  document.body.appendChild(
    temporaryTextArea
  );

  temporaryTextArea.select();

  document.execCommand("copy");

  document.body.removeChild(
    temporaryTextArea
  );
}

function showCopyButton() {
  if (!elements.copyButton) {
    return;
  }

  elements.copyButton.hidden = false;

  elements.copyButton.classList.remove(
    "hidden"
  );
}

function hideCopyButton() {
  if (!elements.copyButton) {
    return;
  }

  elements.copyButton.hidden = true;

  elements.copyButton.classList.add(
    "hidden"
  );
}

function resetCopyButtonLabel() {
  if (!elements.copyButton) {
    return;
  }

  elements.copyButton.textContent =
    "Copy";
}

function setControlsWaiting() {
  if (elements.sendButton) {
    elements.sendButton.disabled = true;
  }

  elements.questionInput.disabled = true;

  elements.questionInput.placeholder =
    "Dandii is thinking...";
}

function setControlsReady() {
  if (elements.sendButton) {
    elements.sendButton.disabled = false;
  }

  elements.questionInput.disabled = false;

  elements.questionInput.placeholder =
    "Ask Dandii a question...";
}

function resizeQuestionInput() {
  if (!elements.questionInput) {
    return;
  }

  elements.questionInput.style.height =
    "auto";

  elements.questionInput.style.height =
    `${elements.questionInput.scrollHeight}px`;
}

function scrollBubblesToBottom() {
  if (elements.bubbleStack) {
    elements.bubbleStack.scrollTop =
      elements.bubbleStack.scrollHeight;
  }

  if (elements.stage) {
    elements.stage.scrollTop =
      elements.stage.scrollHeight;
  }
}
