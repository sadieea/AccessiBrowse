// gemini-api.js
// Make sure to add <script src="https://sdk.gemini.ai/v1.5/gemini-web.js"></script> to your HTML files!

/**
 * Gets the Gemini API key from secure storage.
 * @returns {Promise<string>} The API key.
 * @throws {Error} If the API key is not set.
 */
async function getApiKey() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        resolve(result.geminiApiKey);
      } else {
        // Reject the promise, which will be caught by the calling function
        reject(new Error('API key not set. Please right-click the extension icon, go to "Options", and set your API key.'));
      }
    });
  });
}

/**
 * Initializes and returns a Gemini generative model.
 * @param {string} modelName - The model to use 
 * @returns {Promise<object>} The Gemini GenerativeModel object.
 */
export async function getGeminiModel(modelName = "gemini-2.5-flash") {
    const apiKey = await getApiKey(); // This will throw if the key isn't set
    const genAI = new google.generativeai.GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName });
}
