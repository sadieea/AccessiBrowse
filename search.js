import { getAllMemories } from './db.js';
import { getGeminiModel } from './gemini-api.js'; // IMPORT the secure helper

// --- 1. GET DOM ELEMENTS ---
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results-container');
const chips = document.querySelectorAll('.flex.gap-3.pt-3 button');

// --- 2. SETUP THE AI ---
let model; // Model is now loaded on demand

async function initializeAI() {
    if (model) return true;
    try {
        searchInput.placeholder = "Initializing AI...";
        const model = genAI.getGenerativeModel({ model: "gemini-progemini-2.5-flash" });
        searchInput.placeholder = "Ask your private AI...";
        return true;
    } catch (error) {
        console.error("AI Init Error:", error);
        searchInput.placeholder = "Error: Check API Key in options.";
        resultsContainer.innerHTML = `<p class="text-slate-400">${error.message}</p>`;
        return false;
    }
}

// --- 3. RENDER FUNCTION ---
function renderMemory(item) {
    // (This function is the same. No changes needed)
    const card = document.createElement('div');
    card.className = "flex flex-col gap-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-6";
    const content = item.translated_content || item.content;
    const type = item.type.toUpperCase().replace('-', ' ');
    card.innerHTML = `
        <div class="flex flex-col gap-2">
            <h3 class="text-slate-900 dark:text-white text-lg font-bold leading-snug tracking-tight">${type}</h3>
            <p class="text-slate-600 dark:text-slate-400 text-sm font-normal leading-relaxed line-clamp-2">${content}</p>
        </div>
        <div class="flex justify-between items-center text-slate-500 dark:text-slate-500 text-xs font-medium">
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-base">calendar_today</span><span>${new Date(item.date).toLocaleDateString()}</span></div>
                ${item.url ? `<a href="${item.url}" target="_blank" class="flex items-center gap-1.5"><span class="material-symbols-outlined text-base">link</span>Source</a>` : ''}
            </div>
        </div>
    `;
    resultsContainer.appendChild(card);
}

// --- 4. THE AI SEARCH FUNCTION (CLOUD VERSION) ---
async function performSearch(query) {
    if (!query) return;

    const aiReady = await initializeAI(); // Check if AI is ready
    if (!aiReady) return; // Stop if key is missing

    resultsContainer.innerHTML = `<p class="text-slate-400">Asking the AI about "${query}"...</p>`;

    try {
        const allMemories = await getAllMemories();
        if (allMemories.length === 0) {
            resultsContainer.innerHTML = "<p class='text-slate-400'>You have no memories to search.</p>";
            return;
        }

        const searchableText = allMemories.map((item, index) => {
            const content = item.translated_content || item.content || "";
            return `[Item ${index}]: type: ${item.type}, content: ${content}\n`;
        }).join('\n');

        const prompt = `
You are a private search assistant. The user is searching their private notes.
Find the items that are most relevant to the user's query.
User Query: "${query}"
My Notes:
${searchableText}
Respond *only* with a valid JSON object containing a single key "relevantIndexes" which is an array of the item numbers that are relevant.
Example: {"relevantIndexes": [0, 2]}`;

        // --- THIS IS THE NEW PART ---
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Clean up the response to make sure it's valid JSON
        let text = response.text().replace('```json', '').replace('```', '').trim();
        // --- END OF NEW PART ---
        
        const jsonResult = JSON.parse(text);
        
        if (!jsonResult.relevantIndexes || jsonResult.relevantIndexes.length === 0) {
            resultsContainer.innerHTML = `<p class="text-slate-400">No relevant memories found for "${query}".</p>`;
            return;
        }

        resultsContainer.innerHTML = '';
        jsonResult.relevantIndexes.forEach(index => {
            const memory = allMemories[index];
            if (memory) renderMemory(memory);
        });

    } catch (error) {
        console.error('Semantic search error:', error);
        resultsContainer.innerHTML = '<p class="text-slate-400">An error occurred during the AI search.</p>';
    }
}

// --- 5. EVENT LISTENERS ---
searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        performSearch(searchInput.value.trim());
    }
});

chips.forEach(button => {
    button.addEventListener('click', () => {
        const query = button.querySelector('p').innerText;
        searchInput.value = query;
        performSearch(query);
    });
});

// --- 6. INITIALIZE ---
initializeAI(); // Try to load AI on page load