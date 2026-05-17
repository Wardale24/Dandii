const fs = require("fs");
const path = require("path");

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const FALLBACK_ANSWER = "Dandii is offline. Please try again.";
const UNKNOWN_ANSWER =
  "I don't have information about that in my current knowledge base. Please contact the Biological Design Unit directly.";

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      answer: "Dandii only accepts POST requests."
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY environment variable.");
      return res.status(500).json({ answer: FALLBACK_ANSWER });
    }

    const question = getQuestionFromBody(req.body);

    if (!question) {
      return res.status(400).json({
        answer: "Please enter a question for Dandii."
      });
    }

    const knowledge = readKnowledgeFile();
    const prompt = buildPrompt(knowledge, question);
    const geminiAnswer = await callGemini(apiKey, prompt);

    return res.status(200).json({
      answer: geminiAnswer || UNKNOWN_ANSWER
    });
  } catch (error) {
    console.error("Dandii API error:", error);
    return res.status(500).json({ answer: FALLBACK_ANSWER });
  }
};

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getQuestionFromBody(body) {
  if (!body) {
    return "";
  }

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return sanitizeQuestion(parsed.question);
    } catch {
      return "";
    }
  }

  return sanitizeQuestion(body.question);
}

function sanitizeQuestion(question) {
  if (typeof question !== "string") {
    return "";
  }

  return question.trim().slice(0, 2000);
}

function readKnowledgeFile() {
  const knowledgePath = path.join(process.cwd(), "data", "knowledge.md");

  try {
    return fs.readFileSync(knowledgePath, "utf8");
  } catch (error) {
    console.error(`Unable to read knowledge file at ${knowledgePath}:`, error);
    return "";
  }
}

function buildPrompt(knowledge, question) {
  return `
You are Dandii, the AI assistant for the Biological Design Unit at OIST
(Okinawa Institute of Science and Technology). You are knowledgeable, precise,
and slightly futuristic in tone.

You answer questions ONLY based on the knowledge document provided below.
If the answer is not in the document, respond with exactly:
"${UNKNOWN_ANSWER}"

Do not invent people, publications, projects, contact details, policies, or unit information.
If the knowledge document is empty or only contains placeholders, say you do not have the information.

--- KNOWLEDGE DOCUMENT ---
${knowledge}
--- END KNOWLEDGE ---

USER QUESTION:
${question}

DANDII ANSWER:
`.trim();
}

async function callGemini(apiKey, prompt) {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.25,
        topP: 0.9,
        maxOutputTokens: 1024
      }
    })
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Gemini API error ${response.status}: ${responseText}`);
    throw new Error(`Gemini API error ${response.status}`);
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch (error) {
    console.error("Could not parse Gemini response:", responseText);
    throw error;
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";

  return text;
}
