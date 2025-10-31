// --- 1. DATABASE & DASHBOARD HELPERS ---
// This code is pasted directly from db.js to avoid import errors.

const DB_NAME = 'AccessiBrowseDB';
const STORE_NAME = 'memories';

async function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = (event) => reject("IndexedDB error: " + event.target.errorCode);
    request.onsuccess = (event) => resolve(event.target.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// This is the addMemory function that was missing
async function addMemory(item) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    // Add timestamp to all items
    const itemWithTimestamp = {
        ...item,
        timestamp: new Date().toISOString()
    };
    const request = store.add(itemWithTimestamp);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject('Error adding item: ' + event.target.error);
  });
}

// Helper to notify the dashboard to refresh
async function notifyDashboard() {
  try {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    const tabs = await chrome.tabs.query({ url: dashboardUrl });
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'newMemory' });
    }
  } catch (e) {
    console.error("Error notifying dashboard:", e);
  }
}
// --- 2. API & SPEECH HELPERS ---

/**
 * Gets the stored API key from chrome.storage.local.
 * Rejects if the key is not set.
 */
function getApiKey() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['gemini_api_key'], (items) => {
      if (items.gemini_api_key) {
        resolve(items.gemini_api_key);
      } else {
        reject(new Error('API key not set. Please set it in the extension options.'));
      }
    });
  });
}

/**
 * Extracts text from the Gemini REST API response.
 */
function extractTextFromGeminiResp(json) {
  try {
    if (json?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return json.candidates[0].content.parts[0].text;
    }
    if (json?.error) {
      return `API Error: ${json.error.message}`;
    }
    return 'Error: Unknown response format from API.';
  } catch (e) {
    return `Error parsing API response: ${e.message}`;
  }
}

/**
 * Removes markdown and other special chars for clean speech.
 */
function sanitizeForSpeech(text) {
  // Remove bullets, hashes, and dashes
  let cleanText = text.replace(/[*#-]/g, '');
  // Replace newlines with a period and a space to create a natural pause
  cleanText = cleanText.replace(/\n/g, '. ');
  // Squeeze multiple spaces into one
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  return cleanText;
}

/**
 * Speaks text using the Chrome TTS API (Sanitized Version)
 */
function speak(textToSpeak) {
  const cleanText = sanitizeForSpeech(textToSpeak);
  chrome.tts.stop(); // Stop any previous speech
  chrome.tts.speak(cleanText, { 'rate': 1.0 });
}

/**
 * Converts a Base64 Data URL to a Gemini API part.
 */
function dataUrlToGeminiPart(dataUrl) {
    const [meta, base64Data] = dataUrl.split(',');
    const mimeType = meta.split(';')[0].split(':')[1];
    return {
        inlineData: {
            mimeType: mimeType,
            data: base64Data
        }
    };
}


// --- 3. EXTENSION LIFECYCLE & ACTIONS ---

/**
 * On Install: Create the context menu.
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "describe-image",
    title: "AccessiBrowse: Describe this image",
    contexts: ["image"]
  });
  console.log("Context menu created.");
});

/**
 * On Icon Click: Open the Dashboard.
 */
chrome.action.onClicked.addListener((tab) => {
  const dashboardUrl = chrome.runtime.getURL('dashboard.html');
  chrome.tabs.query({ url: dashboardUrl }, (tabs) => {
    if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
        chrome.tabs.create({ url: dashboardUrl });
    }
  });
});

// --- 4. API CALL HANDLERS ---

/**
 * Handle Hotkeys (Commands)
 */
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log("1. Hotkey pressed:", command); // Checkpoint 1
  let apiKey;
  try {
    apiKey = await getApiKey();
    console.log("2. API Key retrieved."); // Checkpoint 2
  } catch (error) {
    console.error("Hotkey Error (getApiKey):", error);
    speak(error.message);
    return;
  }

  // --- SUMMARIZE PAGE COMMAND ---
  if (command === "summarize-page") {
    try {
      speak("Summarizing page...");
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText
      });
      
      const textToSummarize = results[0].result;
      if (!textToSummarize || textToSummarize.length < 100) {
        speak("Page has no text to summarize.");
        return;
      }
      console.log("3. Got page text.");
      
      const prompt = `Provide a concise, bullet-point summary of the following text:\n\n${textToSummarize.substring(0, 10000)}`;
      const model = 'gemini-2.5-flash';
      const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = { contents: [{ parts: [{ text: prompt }] }] };

      console.log("4. Calling API...");
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      console.log("5. API responded.");

      if (!res.ok) throw new Error(await res.text());
      
      const json = await res.json();
      const summary = extractTextFromGeminiResp(json).trim();
      speak(summary);

      const newMemory = {
        type: 'summary',
        content: summary,
        url: tab.url,
        date: new Date().toISOString()
      };
      await addMemory(newMemory);
      notifyDashboard();

    } catch (error) {
      console.error("Summarize hotkey error:", error);
      speak("Sorry, I could not summarize that page.");
    }
  }

  // --- DESCRIBE PAGE COMMAND ---
  if (command === "describe-page") {
    try {
      speak("Describing page visuals...");
      const imageDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      console.log("3. Got page screenshot.");
      
      const imagePart = dataUrlToGeminiPart(imageDataUrl);
      const prompt = "Concisely describe this webpage screenshot for a blind user. Focus on layout and key elements.";
      const model = 'gemini-2.5-pro'; 
      const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = { contents: [{ parts: [{ text: prompt }, imagePart] }] };

      console.log("4. Calling API...");
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      console.log("5. API responded.");

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      const description = extractTextFromGeminiResp(json).trim();
      speak(description);

      const newMemory = {
        type: 'image-description',
        content: description,
        url: tab.url,
        date: new Date().toISOString()
      };
      await addMemory(newMemory);
      notifyDashboard();

    } catch (error) {
      console.error("Describe hotkey error:", error);
      speak("Sorry, I could not describe that page.");
    }
  }
});

/**
 * Handle Right-Click on Image
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "describe-image" && info.srcUrl) {
    let apiKey;
    try {
      apiKey = await getApiKey();
    } catch (error) {
      speak(error.message);
      return;
    }

    try {
      await chrome.sidePanel.open({ tabId: tab.id });
      chrome.runtime.sendMessage({ action: 'displayResult', data: { content: "Analyzing image..." } });
      speak("Analyzing image...");

      const response = await fetch(info.srcUrl);
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const imagePart = dataUrlToGeminiPart(dataUrl);
      const prompt = "Describe this image in detail for a person with blindness. If it contains text, transcribe it.";
      const model = 'gemini-2.5-pro';
      const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = { contents: [{ parts: [{ text: prompt }, imagePart] }] };

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      const description = extractTextFromGeminiResp(json).trim();
      
      chrome.runtime.sendMessage({
        action: 'displayResult',
        data: {
          type: 'image-description',
          content: description,
          url: info.pageUrl, 
          sourceUrl: info.srcUrl, 
          date: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Context menu error:", error);
      const errorText = "Sorry, I could not analyze that image.";
      speak(errorText);
      chrome.runtime.sendMessage({ action: 'displayError', data: { content: errorText } });
    }
  }
});

/**
 * Handle messages from the Side Panel (for its buttons)
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'summarizePage') {
    (async () => {
      try {
        const apiKey = await getApiKey();
        const model = 'gemini-2.5-flash';
        const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const body = { contents: [{ parts: [{ text: request.prompt }] }] };

        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`API HTTP ${res.status}: ${errText}`);
        }

        const json = await res.json();
        const summary = extractTextFromGeminiResp(json).trim();
        
        if (summary.startsWith('API Error:')) {
            sendResponse({ success: false, error: summary });
        } else {
            sendResponse({ success: true, summary: summary });
        }

      } catch (err) {
        console.error('summarizePage handler error:', err);
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true; 
  }
  
  if (request.action === 'describePage') {
    (async () => {
      try {
        const apiKey = await getApiKey();
        const model = 'gemini-2.5-pro';
        const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const imagePart = dataUrlToGeminiPart(request.imageDataUrl);
        const prompt = "Concisely describe this webpage screenshot for a blind user. Focus on layout and key elements.";
        const body = { contents: [{ parts: [{ text: prompt }, imagePart] }] };
        
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`API HTTP ${res.status}: ${errText}`);
        }

        const json = await res.json();
        const description = extractTextFromGeminiResp(json).trim();
        
        if (description.startsWith('API Error:')) {
            sendResponse({ success: false, error: description });
        } else {
            sendResponse({ success: true, description: description });
        }
        
      } catch (err) {
        console.error('describePage handler error:', err);
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true; 
  }
  
});