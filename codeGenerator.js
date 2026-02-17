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
        console.log("CodeGenerator: Trying with gemini-pro...");
        const model = genAIInstance.getGenerativeModel({ model: "gemini-pro" });

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
        modelUsed = 'gemini-pro';

        if (!responseText || responseText.trim() === '') {
            console.warn("⚠️ Gemini-pro returned empty response, trying gemini-flash...");
            const flashModel = genAIInstance.getGenerativeModel({ model: "gemini-flash" });
            const flashResult = await flashModel.generateContent({
                contents: [{ parts: [{ text: prompt }]}],
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.2,
                    topP: 0.9,
                    topK: 40,
                },
            });
            responseText = flashResult.response.text();
            modelUsed = 'gemini-flash';
        }

    } catch (error) {
        console.error("CodeGenerator: Gemini failed:", error);
        throw error;
    }

    return { text: responseText, model: modelUsed };
}

module.exports = {
    generateCode
};
