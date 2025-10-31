import { addMemory, getAllMemories } from './db.js';
import { getGeminiModel } from './gemini-api.js'; // IMPORT the secure helper

// --- 1. GET DOM ELEMENTS ---
const voiceEntryBtn = document.getElementById('record-button');
const voiceStatusText = document.getElementById('record-status');
const entriesContainer = document.getElementById('entries-container');

// --- 2. SETUP THE AI ---
let model; // Model is now loaded on demand

async function initializeAI() {
    if (model) return true;
    try {
        voiceStatusText.innerText = 'Initializing AI...';
        const model = genAI.getGenerativeModel({ model: "gemini-progemini-2.5-flash" });
        voiceStatusText.innerText = 'AI ready. Press the mic to start.';
        return true;
    } catch (error) {
        console.error("AI Init Error:", error);
        voiceStatusText.innerText = error.message;
        voiceEntryBtn.disabled = true;
        return false;
    }
}

// --- 3. RENDER FUNCTION ---
function renderMemory(item) {
    if (item.type !== 'journal') return;
    const card = document.createElement('div');
    card.className = "bg-[#1a2c36]/50 rounded-lg p-6";
    card.innerHTML = `
        <div class="flex items-start justify-between gap-6">
            <div class="flex flex-[2_2_0px] flex-col gap-3">
                <div class="flex flex-col gap-1">
                    <p class="text-white text-base font-medium leading-tight">${item.translated_content}</p>
                    <p class="text-[#92b7c9] text-sm font-normal leading-normal">${item.original_transcription}</p>
                </div>
            </div>
            <div class="text-sm text-[#92b7c9] whitespace-nowrap">${new Date(item.date).toLocaleDateString()}</div>
        </div>
    `;
    entriesContainer.prepend(card);
}

// --- 4. LOAD EXISTING ENTRIES ---
async function loadEntries() {
    entriesContainer.innerHTML = '';
    const memories = await getAllMemories();
    memories.filter(item => item.type === 'journal').reverse().forEach(renderMemory);
}

// --- 5. VOICE RECORDING LOGIC (PIVOTED) ---
// (Your existing logic using SpeechRecognition is great)
function runSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceStatusText.innerText = "Error: Your browser doesn't support Speech Recognition.";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        voiceStatusText.innerText = "Listening... Please speak now.";
        voiceEntryBtn.querySelector('span').innerText = 'mic_off';
        voiceEntryBtn.disabled = true;
    };

    recognition.onresult = async (event) => {
        const transcribedText = event.results[0][0].transcript;
        voiceStatusText.innerText = "Transcribed. Now translating...";

        // --- STEP A: CHECK AI ---
        const aiReady = await initializeAI();
        if (!aiReady) return;

        // --- STEP B: TRANSLATE (using Gemini API) ---
        try {
            const prompt = `Translate the following text to English and provide the source language name. Respond *only* with a valid JSON object.
            Example: {"original": "Hola", "translated": "Hello", "language": "Spanish"}
            Text: "${transcribedText}"`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().replace('```json', '').replace('```', '').trim();
            const jsonResult = JSON.parse(text);

            // --- STEP C: SAVE ---
            const newItem = {
                type: 'journal',
                original_transcription: jsonResult.original,
                translated_content: jsonResult.translated,
                original_language: jsonResult.language,
                date: new Date().toISOString()
            };
            
            await addMemory(newItem);
            
            // --- STEP D: UPDATE UI ---
            voiceStatusText.innerText = 'Saved! Press the button to start a new entry.';
            renderMemory(newItem);
            
        } catch (error) {
            console.error("AI Error:", error);
            voiceStatusText.innerText = `Error: ${error.message}`;
        }
    };

    recognition.onend = () => {
        voiceEntryBtn.querySelector('span').innerText = 'mic';
        voiceEntryBtn.disabled = false;
    };

    recognition.onerror = (event) => {
        voiceStatusText.innerText = `Speech Error: ${event.error}`;
    };

    recognition.start();
}

// Re-write the click handler
voiceEntryBtn.addEventListener('click', () => {
    runSpeechRecognition();
});


// --- 6. INITIALIZE ---
loadEntries();
initializeAI(); // Try to init AI on load