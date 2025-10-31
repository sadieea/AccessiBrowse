const apiKeyInput = document.getElementById('api-key');
const saveButton = document.getElementById('save-button');
const statusEl = document.getElementById('status');

// Load saved key (if any)
document.addEventListener('DOMContentLoaded', () => {
    // Look for the 'snake_case' key
    chrome.storage.local.get(['gemini_api_key'], (result) => {
        if (result.gemini_api_key) {
            apiKeyInput.value = result.gemini_api_key;
        }
    });
});

// Save the key
saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value;
    // Save it as 'snake_case' so the service-worker can find it
    chrome.storage.local.set({ gemini_api_key: apiKey }, () => {
        statusEl.textContent = 'API Key saved!';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
    });
});