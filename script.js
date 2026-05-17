const DANDII_OFFLINE_MESSAGE = "Dandii is offline. Please try again.";
const EMPTY_KNOWLEDGE_MESSAGE =
  "I don't have information about that in my current knowledge base. Please contact the Biological Design Unit directly.";

const state = {
  currentQuestion: "",
  isWaiting: false,
  maxCharacters: 1200,
  typewriterTimer: null
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  elements.chatWindow = document.getElementById("chat-window");
  elements.ghostInput = document.getElementById("ghost-input");
  elements.queryText = document.getElementById("query-text");

  renderGhostInput();

  addMessage(
    "assistant",
    "DANDII online.\nType anywhere on the page, then press ENTER to query the Biological Design Unit knowledge base."
  );

  window.addEventListener("keydown", handleGlobalKeydown);
});

function handleGlobalKeydown(event) {
  if (shouldIgnoreKeydown(event)) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    clearGhostInput();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();

    if (state.currentQuestion.length > 0) {
      state.currentQuestion = state.currentQuestion.slice(0, -1);
      renderGhostInput();
    }

    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();

    if (state.isWaiting) {
      flashGhostInput();
      return;
    }

    submitCurrentQuestion();
    return;
  }

  if (state.isWaiting) {
    return;
  }

  if (event.key.length === 1 && state.currentQuestion.length < state.maxCharacters) {
    event.preventDefault();
    state.currentQuestion += event.key;
    renderGhostInput();
  }
}

function shouldIgnoreKeydown(event) {
  const target = event.target;
  const tagName = target?.tagName?.toLowerCase();

  if (event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }

  if (target?.isContentEditable) {
    return true;
  }

  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function renderGhostInput() {
  const hasText = state.currentQuestion.length > 0;

  elements.queryText.textContent = hasText
    ? state.currentQuestion
    : "TYPE ANYWHERE TO QUERY BIOLOGICAL DESIGN UNIT";

  elements.ghostInput.classList.toggle("active", hasText);
}

function clearGhostInput() {
  state.currentQuestion = "";
  renderGhostInput();
}

function flashGhostInput() {
  elements.ghostInput.classList.add("error-flash");

  window.setTimeout(() => {
    elements.ghostInput.classList.remove("error-flash");
  }, 260);
}

async function submitCurrentQuestion() {
  const question = state.currentQuestion.trim();

  if (!question) {
    flashGhostInput();
    return;
  }

  state.currentQuestion = "";
  state.isWaiting = true;
  renderGhostInput();

  addMessage("user", question);
  const thinkingMessage = addThinkingMessage();

  try {
    const answer = await askDandii(question);
    removeMessage(thinkingMessage);

    await typeAssistantMessage(answer || EMPTY_KNOWLEDGE_MESSAGE);
  } catch (error) {
    console.error("Dandii request failed:", error);
    removeMessage(thinkingMessage);

    await typeAssistantMessage(DANDII_OFFLINE_MESSAGE);
  } finally {
    state.isWaiting = false;
    renderGhostInput();
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

function addMessage(role, text) {
  const message = document.createElement("article");
  message.className = `message ${role}`;

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "USER" : "DANDII";

  const body = document.createElement("div");
  body.className = "message-body";
  body.textContent = text;

  message.appendChild(label);
  message.appendChild(body);

  elements.chatWindow.appendChild(message);
  scrollChatToBottom();

  return message;
}

function addThinkingMessage() {
  const message = document.createElement("article");
  message.className = "message assistant thinking";

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = "DANDII";

  const body = document.createElement("div");
  body.className = "message-body";

  const dots = document.createElement("span");
  dots.className = "thinking-dots";
  dots.setAttribute("aria-label", "Dandii is thinking");

  ["·", "·", "·"].forEach((dotText) => {
    const dot = document.createElement("span");
    dot.textContent = dotText;
    dots.appendChild(dot);
  });

  body.appendChild(dots);
  message.appendChild(label);
  message.appendChild(body);

  elements.chatWindow.appendChild(message);
  scrollChatToBottom();

  return message;
}

function removeMessage(message) {
  if (message && message.parentNode) {
    message.parentNode.removeChild(message);
  }
}

function typeAssistantMessage(text) {
  return new Promise((resolve) => {
    const message = addMessage("assistant", "");
    const body = message.querySelector(".message-body");

    let index = 0;
    const speedMs = getTypewriterSpeed(text);

    clearInterval(state.typewriterTimer);

    state.typewriterTimer = window.setInterval(() => {
      if (index >= text.length) {
        clearInterval(state.typewriterTimer);
        state.typewriterTimer = null;
        resolve();
        return;
      }

      body.textContent += text.charAt(index);
      index += 1;

      if (index % 8 === 0) {
        scrollChatToBottom();
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

function scrollChatToBottom() {
  elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
}
