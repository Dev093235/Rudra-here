const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config(); // For local .env use

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

// === Main Chat Endpoint ===
app.post('/', async (req, res) => {
    const userMessageFull = req.body.prompt;
    const senderID = req.body.senderID || 'anonymous_user';

    if (!userMessageFull) {
        return res.status(400).json({ error: "Prompt parameter is required in the request body." });
    }

    console.log(`📩 Prompt received from ${senderID}: "${userMessageFull}"`);

    let responseText = '';
    let modelUsed = '';

    let languageInstruction = '';
    let actualUserMessageForAI = userMessageFull;

    const langInstructionPrefix = "LANGUAGE_INSTRUCTION:";
    const actualPromptPrefix = "ACTUAL_PROMPT:";

    if (userMessageFull.startsWith(langInstructionPrefix)) {
        const parts = userMessageFull.split(actualPromptPrefix);
        if (parts.length > 1) {
            languageInstruction = parts[0].replace(langInstructionPrefix, '').trim();
            actualUserMessageForAI = parts[1].trim();
            console.log(`🌐 Language: "${languageInstruction}"`);
            console.log(`💬 Actual Prompt: "${actualUserMessageForAI}"`);
        }
    }

    const CODE_GEN_PREFIX = "CODE_GEN_REQUEST:";
    const isExplicitCodeGenerationRequest = actualUserMessageForAI.startsWith(CODE_GEN_PREFIX);
    let finalPromptToGemini = actualUserMessageForAI;

    if (isExplicitCodeGenerationRequest) {
        finalPromptToGemini = actualUserMessageForAI.slice(CODE_GEN_PREFIX.length).trim();
    } else {
        if (languageInstruction) {
            finalPromptToGemini = `${languageInstruction} ${actualUserMessageForAI}`;
        }
    }

    try {
        if (isExplicitCodeGenerationRequest) {
            console.log("🛠️ Using codeGenerator for code request.");
            const codeResponse = await codeGenerator.generateCode(finalPromptToGemini, genAI);
            responseText = codeResponse.text;
            modelUsed = codeResponse.model;
        } else {
            console.log("✨ Using gemini-pro...");
            const proModel = genAI.getGenerativeModel({ model: "gemini-pro" }); 
            const proChat = proModel.startChat({ 
                generationConfig: { maxOutputTokens: 200, temperature: 0.7 } 
            });
            const proResult = await proChat.sendMessage(finalPromptToGemini);
            responseText = proResult.response.text();
            modelUsed = 'gemini-pro';

            if (!responseText || responseText.trim() === '') {
                throw new Error("⚠️ Gemini-pro returned empty response.");
            }
        }

    } catch (error) {
        console.error("❌ Gemini model failed:", error);
        return res.status(500).json({ error: `Gemini model failed: ${error.message || "Unknown error"}` });
    }

    console.log(`✅ Replied using ${modelUsed}:`, responseText);
    res.json({ text: responseText });
});

// Root check
app.get('/', (req, res) => {
    res.send('🌐 Rudra AI Server is running!');
});

app.listen(port, () => {
    console.log(`🚀 Rudra AI Server listening on port ${port}`);
});
