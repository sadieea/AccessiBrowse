import { addMemory } from './db.js';
import { getGeminiModel } from './gemini-api.js'; // IMPORT the secure helper

// --- 1. GET DOM ELEMENTS ---
const textInput = document.getElementById('text-input');
const rewriteCasualBtn = document.getElementById('rewrite-casual-btn');
const rewriteFormalBtn = document.getElementById('rewrite-formal-btn');
const rewriteShorterBtn = document.getElementById('rewrite-shorter-btn');
const saveBtn = document.getElementById('save-btn');
const statusDiv = document.getElementById('status-output');

// --- 2. SETUP THE AI ---
let model; // Model is now loaded on demand

// Helper to initialize AI securely
async function initializeAI() {
    if (model) return true; // Already initialized
    try {
        statusDiv.innerText = 'Initializing AI...';
        const model = genAI.getGenerativeModel({ model: "gemini-progemini-2.5-flash" }); // Gets model securely
        statusDiv.innerText = 'Cloud AI Rewriters are ready.';
        return true;
    } catch (error) {
        console.error("AI Init Error:", error);
        statusDiv.innerText = error.message; // Will show "API key not set..."
        return false;
    }
}

// --- 3. REWRITE EVENT LISTENERS (CLOUD VERSION) ---
async function rewriteText(prompt) {
    const text = textInput.value;
    if (!text) return;

    const aiReady = await initializeAI(); // Check if AI is ready
    if (!aiReady) return; // Stop if key is missing

    statusDiv.innerText = 'Rewriting with cloud AI...';
    try {
        const fullPrompt = `${prompt}: "${text}"`;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        textInput.value = response.text().trim();
        statusDiv.innerText = 'Rewrite complete.';
    } catch (error) {
        console.error("AI Error:", error);
        statusDiv.innerText = `Error: ${error.message}`;
    }
}

rewriteCasualBtn.addEventListener('click', () => {
    rewriteText("Rewrite the following text in a more casual tone");
});

rewriteFormalBtn.addEventListener('click', () => {
    rewriteText("Rewrite the following text in a more formal tone");
});

rewriteShorterBtn.addEventListener('click', () => {
    rewriteText("Rewrite the following text to be shorter and more concise");
});

// --- 4. SAVE EVENT LISTENER ---
saveBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) return;

    try {
        const newItem = {
            type: 'journal',
            content: text,
            translated_content: text,
            date: new Date().toISOString()
        };
        await addMemory(newItem);
        statusDiv.innerText = 'Saved to your Private Hub!';
        textInput.value = ''; // Clear input
    } catch (error) {
        console.error('Error saving entry:', error);
        statusDiv.innerText = 'Could not save entry.';
    }
});

// --- 5. INITIALIZE ---
initializeAI(); // Try to load the AI when the page opens