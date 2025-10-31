import { addMemory } from './db.js';

// --- 1. GET DOM ELEMENTS ---
const summarizeBtn = document.getElementById('summarize-btn');
const describeBtn = document.getElementById('describe-page-btn');
const outputDiv = document.getElementById('output');
const saveBtn = document.getElementById('save-btn');
const errorDiv = document.getElementById('error-output');

let currentDataToSave = null; 

// --- 2. SUMMARIZE FEATURE (sends message) ---
summarizeBtn.addEventListener('click', async () => {
    outputDiv.innerText = "Getting page text...";
    errorDiv.innerText = "";
    saveBtn.style.display = 'none';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText 
        });
        
        const textToSummarize = results[0].result;
        if (!textToSummarize || textToSummarize.length < 100) {
            throw new Error("Page has no text to summarize.");
        }
        
        outputDiv.innerText = "Summarizing with AI...";
        const prompt = `Provide a concise, bullet-point summary of the following text:\n\n${textToSummarize.substring(0, 10000)}`;

        const response = await chrome.runtime.sendMessage({
            action: 'summarizePage',
            prompt: prompt
        });

        if (response.success) {
            outputDiv.innerText = response.summary;
            currentDataToSave = {
                type: 'summary',
                content: response.summary,
                url: tab.url,
                date: new Date().toISOString()
            };
            saveBtn.style.display = 'block';
        } else {
            throw new Error(response.error); 
        }

    } catch (error) {
        console.error("Side Panel Summarize Error:", error.message);
        errorDiv.innerText = `Error: ${error.message}`;
    }
});

// --- 3. DESCRIBE VISUALS (sends message) ---
describeBtn.addEventListener('click', async () => {
    outputDiv.innerText = "Taking screenshot...";
    errorDiv.innerText = "";
    saveBtn.style.display = 'none';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const imageDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });

        outputDiv.innerText = "Analyzing visuals with AI...";
        
        const response = await chrome.runtime.sendMessage({
            action: 'describePage',
            imageDataUrl: imageDataUrl
        });

        if (response.success) {
            outputDiv.innerText = response.description;
            currentDataToSave = {
                type: 'image-description',
                content: response.description,
                url: tab.url,
                date: new Date().toISOString()
            };
            saveBtn.style.display = 'block';
        } else {
            throw new Error(response.error);
        }

    } catch (error) {
        console.error("Side Panel Describe Error:", error.message);
        errorDiv.innerText = `Error: ${error.message}`;
    }
});

// --- 4. SAVE TO DASHBOARD ---
saveBtn.addEventListener('click', async () => {
    if (!currentDataToSave) {
        console.error("Save clicked, but no data to save.");
        return;
    }
    errorDiv.innerText = "";
    
    try {
        await addMemory(currentDataToSave); // Save to the new, fixed DB
        outputDiv.innerText = "Saved to dashboard!";
        saveBtn.style.display = 'none';
        currentDataToSave = null; // Clear the data
        
        // Notify dashboard to refresh
        const dashboardUrl = chrome.runtime.getURL('dashboard.html');
        const tabs = await chrome.tabs.query({ url: dashboardUrl });
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'newMemory' });
        }
    } catch (error) {
        console.error('Error saving from side panel:', error);
        errorDiv.innerText = "Error saving. Please try again.";
    }
});

// --- 5. LISTENER FOR CONTEXT MENU ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'displayResult') {
        const data = request.data;
        outputDiv.innerText = data.content;
        // Check if it's a full data object or just a loading message
        if (data.type === 'image-description') {
            currentDataToSave = data;
            saveBtn.style.display = 'block';
        }
        errorDiv.innerText = "";
    }
    
    if (request.action === 'displayError') {
        outputDiv.innerText = "";
        errorDiv.innerText = `Error: ${request.data.content}`;
        saveBtn.style.display = 'none';
    }

});
