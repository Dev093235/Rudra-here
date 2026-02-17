const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini का उपयोग करके कोड जनरेट करता है।
 * @param {string} prompt - कोड जनरेशन के लिए यूज़र का प्रॉम्प्ट
 * @param {GoogleGenerativeAI} genAIInstance - GoogleGenerativeAI इंस्टेंस
 * @returns {Promise<{text: string, model: string}>}
 */
async function generateCode(prompt, genAIInstance) {
    let responseText = '';
    let modelUsed = '';

    try {
        console.log("CodeGenerator: Trying with gemini-1.5-pro-latest...");
        const model = genAIInstance.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

        const result = await model.generateContent({
            contents: [{ parts: [{ text: prompt }]}],
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.2,
                topP: 0.9,
                topK: 40,
            },
        });

        responseText = result.response.text();
        modelUsed = 'gemini-1.5-pro-latest';

        if (!responseText || responseText.trim() === '') {
            throw new Error("Gemini 1.5 Pro returned empty response. No fallback available.");
        }

    } catch (error) {
        console.error("CodeGenerator: Gemini failed, no other fallback available:", error);
        throw error; // Seedha error throw karega, OpenAI fallback nahi hai ab
    }

    return { text: responseText, model: modelUsed };
}

module.exports = {
    generateCode
};
