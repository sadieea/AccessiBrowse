import { getAllMemories } from './db.js';

// Get the main grid from dashboard.html
const memoriesContainer = document.getElementById('memories-container');

async function loadMemories() {
    if (!memoriesContainer) return; // In case we're on the wrong page
    
    memoriesContainer.innerHTML = '<p class="text-text-light">Loading your private memories...</p>';
    try {
        const memories = await getAllMemories();
        memories.reverse(); // Show newest first
        
        if (memories.length === 0) {
            memoriesContainer.innerHTML = '<p class="text-text-light text-center col-span-full">No memories saved yet. Try the "New Memory" page!</p>';
            return;
        }

        memoriesContainer.innerHTML = ''; // Clear loading
        memories.forEach(renderMemory);

    } catch (error) {
        console.error('Error loading memories:', error);
        memoriesContainer.innerHTML = '<p class="text-text-light">Error loading memories.</p>';
    }
}

function renderMemory(item) {
    const card = document.createElement('div');
    // These classes are copied directly from your dashboard.html design
    card.className = "flex flex-col gap-4 rounded-xl bg-card-dark p-5 shadow-neumorphic-lite-dark transition-transform hover:-translate-y-1";
    
    let chipColor = 'bg-gray-500';
    let type = item.type.toUpperCase().replace('-', ' ');

    if (type === 'JOURNAL') chipColor = 'bg-journal-accent';
    if (type === 'SUMMARY') chipColor = 'bg-web-accent';
    if (type === 'IMAGE DESCRIPTION') chipColor = 'bg-image-accent'; // Match our new type

    // Use the translated content if it exists, otherwise default to content
    const content = item.translated_content || item.content;

    card.innerHTML = `
        <div class="flex items-start justify-between">
            <span class="rounded-full ${chipColor} px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">${type}</span>
            <p class="text-text-secondary text-sm">${new Date(item.date).toLocaleDateString()}</p>
        </div>
        <div class="flex flex-col gap-4">
            <p class="text-text-light text-base font-normal leading-relaxed line-clamp-3">
                ${content}
            </p>
        </div>
        ${item.url ? `<a class="text-primary text-sm font-normal leading-normal self-start underline hover:no-underline" href="${item.url}" target="_blank">Source: ${item.url}</a>` : ''}
    `;
    memoriesContainer.appendChild(card);
}

// Initial load when the page opens

// --- ADD THIS TO THE END OF dashboard.js ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Listen for the refresh message from the service worker or side panel
  if (request.action === 'newMemory') {
    console.log("New memory saved, refreshing dashboard...");
    loadMemories(); // Re-run the function to load all memories
  }
});