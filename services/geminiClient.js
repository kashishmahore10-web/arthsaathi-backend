const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY is not set in .env — AI agent routes will fail until it's added.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const askGemini = async (systemPrompt, userMessage, options = {}, retries = 3) => {
  const { temperature = 0.7 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature,
          maxOutputTokens: 1024,
        },
      });
      return response.text;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Gemini busy, retry ${i + 1}/${retries}...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

module.exports = { askGemini };