const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const codeGenerator = require('./codeGenerator'); 

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI;
if (GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        console.log("✅ Gemini AI client initialized.");
    } catch (error) {
        console.error("❌ Error initializing Gemini AI:", error.message);
        process.exit(1);
    }
} else {
    console.error("❌ GEMINI_API_KEY not set.");
    process.exit(1);
}

app.post('/', async (req, res) => {
    const userMessageFull = req.body.prompt;
    const senderID = req.body.senderID || 'anonymous_user';

    if (!userMessageFull) {
        return res.status(400).json({ error: "Prompt parameter is required in the request body." });
    }

    console.log(`📩 Prompt received from ${senderID}: "${userMessageFull}"`);

    let responseText = '';
    let modelUsed = '';

    try {
        if (userMessageFull.startsWith("CODE_GEN_REQUEST:")) {
            console.log("🛠️ Using codeGenerator for code request.");
            const codeResponse = await codeGenerator.generateCode(
                userMessageFull.replace("CODE_GEN_REQUEST:", "").trim(),
                genAI
            );
            responseText = codeResponse.text;
            modelUsed = codeResponse.model;
        } else {
            console.log("✨ Using gemini-pro...");
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent({
                contents: [{ parts: [{ text: userMessageFull }]}],
                generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
            });
            responseText = result.response.text();
            modelUsed = 'gemini-pro';

            if (!responseText || responseText.trim() === '') {
                console.warn("⚠️ Gemini-pro returned empty response, trying gemini-flash...");
                const flashModel = genAI.getGenerativeModel({ model: "gemini-flash" });
                const flashResult = await flashModel.generateContent({
                    contents: [{ parts: [{ text: userMessageFull }]}],
                    generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
                });
                responseText = flashResult.response.text();
                modelUsed = 'gemini-flash';
            }
        }
    } catch (error) {
        console.error("❌ Gemini model failed:", error);
        return res.status(500).json({ error: `Gemini model failed: ${error.message || "Unknown error"}` });
    }

    console.log(`✅ Replied using ${modelUsed}:`, responseText);
    res.json({ text: responseText });
});

app.get('/', (req, res) => {
    res.send('🌐 Rudra AI Server is running!');
});

app.listen(port, () => {
    console.log(`🚀 Rudra AI Server listening on port ${port}`);
});
