const DANDII_OFFLINE_MESSAGE = "Dandii is offline. Please try again.";

const state = {
  currentQuestion: "",
  lastAnswer: "",
  isWaiting: false,
  isTypingAnswer: false,
  maxCharacters: 1200,
  typewriterTimer: null
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  elements.centerText = document.getElementById("center-text");
  renderBlank();

  window.addEventListener("keydown", handleGlobalKeydown);
});

function handleGlobalKeydown(event) {
  if (shouldIgnoreKeydown(event)) {
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (state.isWaiting || state.isTypingAnswer) {
    event.preventDefault();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    clearEverything();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();

    if (state.currentQuestion.length > 0) {
      state.currentQuestion = state.currentQuestion.slice(0, -1);
      renderQuestion();
    } else {
      renderBlank();
    }

    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    submitCurrentQuestion();
    return;
  }

  if (event.key.length === 1 && state.currentQuestion.length < state.maxCharacters) {
    event.preventDefault();

    if (state.lastAnswer) {
      state.lastAnswer = "";
      state.currentQuestion = "";
    }

    state.currentQuestion += event.key;
    renderQuestion();
  }
}

function shouldIgnoreKeydown(event) {
  const target = event.target;
  const tagName = target?.tagName?.toLowerCase();

  if (target?.isContentEditable) {
    return true;
  }

  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function renderBlank() {
  elements.centerText.className = "center-text";
  elements.centerText.textContent = "";
}

function renderQuestion() {
  if (!state.currentQuestion) {
    renderBlank();
    return;
  }

  elements.centerText.className = "center-text visible";
  elements.centerText.innerHTML = `${escapeHtml(state.currentQuestion)}<span class="cursor">_</span>`;
}

function renderWaiting(question) {
  elements.centerText.className = "center-text visible waiting";
  elements.centerText.textContent = question;
}

function renderAnswer(text) {
  elements.centerText.className = "center-text visible answer";
  elements.centerText.textContent = text;
}

function clearEverything() {
  state.currentQuestion = "";
  state.lastAnswer = "";
  state.isWaiting = false;
  state.isTypingAnswer = false;

  if (state.typewriterTimer) {
    clearInterval(state.typewriterTimer);
    state.typewriterTimer = null;
  }

  renderBlank();
}

async function submitCurrentQuestion() {
  const question = state.currentQuestion.trim();

  if (!question) {
    renderBlank();
    return;
  }

  state.currentQuestion = "";
  state.lastAnswer = "";
  state.isWaiting = true;

  renderWaiting(question);

  try {
    const answer = await askDandii(question);
    state.isWaiting = false;
    await typeAnswer(answer || DANDII_OFFLINE_MESSAGE);
  } catch (error) {
    console.error("Dandii request failed:", error);
    state.isWaiting = false;
    await typeAnswer(DANDII_OFFLINE_MESSAGE);
  }
}

async function askDandii(question) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question })
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  return data.answer;
}

function typeAnswer(text) {
  return new Promise((resolve) => {
    state.isTypingAnswer = true;
    state.lastAnswer = text;

    let index = 0;
    const speedMs = getTypewriterSpeed(text);

    if (state.typewriterTimer) {
      clearInterval(state.typewriterTimer);
    }

    renderAnswer("");

    state.typewriterTimer = window.setInterval(() => {
      index += 1;
      renderAnswer(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(state.typewriterTimer);
        state.typewriterTimer = null;
        state.isTypingAnswer = false;
        resolve();
      }
    }, speedMs);
  });
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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
