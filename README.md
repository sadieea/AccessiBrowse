# AccessiBrowse
AccessiBrowse is a "hybrid AI" accessibility suite that gives visually impaired users the power to see, summarize, and semantically search the web. It combines a Chrome extension "collector" with a 100% private, on-device "dashboard," ensuring all personal data and memories stay on the user's computer.

## The Problem
For millions of blind and low-vision users, the web is a broken experience. Standard screen readers fail when they encounter non-semantic content. They cannot:

* Read text inside images, infographics, or charts.
* Understand complex visual layouts or non-standard buttons.
* Provide a quick overview of a long, dense article.
* Privately save and search their own notes and web findings.

## Our Solution: A Hybrid AI Suite

AccessiBrowse solves this by acting as a "visual and cognitive layer" for the browser.

* **The "Collector" (Chrome Extension):** Uses hotkeys and a side panel to summarize pages, describe visual layouts, and read text from any image using the Gemini API.
* **The "Hub" (Private Dashboard):** A full, on-device web app where all collected data is saved. It uses IndexedDB, meaning the user's private journal entries, notes, and summaries **never leave their machine**.

## Core Features

### 1. Collector (Extension Side Panel)
* **AI Page Summarizer:** Summarizes any webpage with a hotkey (`Ctrl+Shift+S`).
* **AI Visual Describer:** Describes the visual layout of a page with a hotkey (`Ctrl+Shift+R`).
* **AI Image Describer:** Right-click any image to get a detailed description.
* **Save to Hub:** Save any summary or description to your private dashboard.

### 2. Hub (Private Dashboard)
* **Voice-First Journal:** Use your voice to make journal entries. The AI transcribes, translates, and saves it.
* **Writer's Hub:** An accessible text editor with AI tools ("Rewrite," "Make Shorter").
* **Private Semantic Search:** The "killer feature." Perform AI-powered search across *your own* private data (summaries, notes, journal entries) without any privacy compromise.

## Hybrid AI
This project is the definition of a **Hybrid AI Strategy**.

* **Cloud AI (Gemini API):** We use the powerful cloud-based Gemini API (e.g., `gemini-2.5-pro`) for complex, high-intelligence tasks like vision, summarization, and translation.
* **On-Device Storage (IndexedDB):** All user data, context, and memories are kept 100% private and on-device. This allows for powerful AI features without sacrificing user privacy.

## Tech Stack
* **Chrome Extension (Manifest V3)**
* **HTML, CSS, JavaScript (Modules)**
* **IndexedDB** (for all private storage)
* **Gemini (Cloud) API** (for AI generation)
* **Chrome TTS & SpeechRecognition APIs**

## How to Run This Project

1.  Download or clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Turn on **"Developer mode"** (top right).
4.  Click **"Load unpacked"**.
5.  Select the folder where you downloaded this project.
6.  **Set your API Key:** Right-click the extension icon, go to **"Options"**, and paste your Google AI Studio API key.
7.  You're all set! Use the hotkeys or open the dashboard by clicking the extension icon.
