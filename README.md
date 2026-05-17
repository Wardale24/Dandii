# Dandii — AI Chatbot for the Biological Design Unit at OIST

[![Repository](https://img.shields.io/badge/GitHub-Wardale24%2FDandii-181717?logo=github)](https://github.com/Wardale24/Dandii)
[![License: MIT](https://img.shields.io/badge/License-MIT-00f5d4.svg)](#license)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

Dandii is a lightweight AI chatbot for the Biological Design Unit at OIST. It answers questions using a local markdown knowledge document and is designed to be deployed on Vercel using serverless functions.

The frontend has a videogame-terminal aesthetic with global keyboard capture. There are no visible input boxes: users type anywhere on the page, see their current query in a ghost prompt, and press ENTER to submit.

---

## 1. What is Dandii?

Dandii is a conversational AI assistant for the Biological Design Unit at OIST.

It is designed to:

- Answer questions based only on a local knowledge file.
- Clearly say when information is not available.
- Run without paid infrastructure.
- Deploy easily to Vercel.
- Leave space for a future 3D Dandii model in the main interface.

Dandii does not use a vector database. Instead, it injects the contents of `data/knowledge.md` into the Gemini prompt at request time.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla HTML, CSS, and JavaScript |
| Backend | Vercel Serverless Function |
| AI Model | Google Gemini 1.5 Flash via REST API |
| Knowledge Base | Markdown file at `data/knowledge.md` |
| Deployment | Vercel |
| Future 3D Model Slot | Reserved `#model-viewport` area |

---

## 3. Project Structure

```text
/home/alex/Dandii/
├── index.html              # Main frontend HTML
├── style.css               # Complete visual styling and animations
├── script.js               # Keyboard capture, API calls, chat UI, typewriter effect
├── api/
│   └── chat.js             # Vercel serverless function for Gemini calls
├── data/
│   └── knowledge.md        # Local knowledge base used by Dandii
├── public/
│   └──                     # Future 3D model assets go here
├── vercel.json             # Vercel routing/build configuration
├── .gitignore              # Files ignored by Git
├── .env.example            # Example environment variable file
├── package.json            # Minimal Node project metadata
└── README.md               # Setup, deployment, and usage guide
