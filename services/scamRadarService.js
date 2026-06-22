const { askGemini } = require("./geminiClient");
const AgentLog = require("../models/AgentLog");
const axios = require("axios");

const LANGUAGE_NAMES = {
  hi: "Hindi", en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", pa: "Punjabi", or: "Odia",
};

const SYSTEM_PROMPT = `You are ScamRadar, a fraud-detection assistant inside the ArthSaathi app. Users forward you suspicious messages — investment tips, loan offers, lottery/prize notifications, job offers, or links — that they received via WhatsApp, SMS, or other channels.

Your job: analyze the message and assess scam risk.

Look for these common Indian scam patterns:
- Guaranteed high returns ("double your money in 30 days", unrealistic SIP/stock returns)
- Urgency and pressure tactics ("offer expires in 2 hours", "act now")
- Requests for upfront payment, OTP, PIN, or bank/UPI details
- Impersonation of banks, government schemes, or RBI/SEBI
- Too-good-to-be-true job offers (work from home, huge pay for minimal work)
- Suspicious or shortened links, or links to non-official domains claiming to be banks/government
- Lottery/prize notifications for contests the user never entered

You MUST respond with ONLY a valid JSON object (no markdown formatting, no code fences, no extra text before or after) matching exactly this shape:
{
  "riskScore": <integer 0-100, where 0 = definitely safe, 100 = definitely a scam>,
  "verdict": "<one of: safe, suspicious, likely_scam>",
  "reasons": ["<short reason 1>", "<short reason 2>", ...],
  "userMessage": "<a short, warm, plain-language explanation for the user, in {LANGUAGE}, telling them what you found and what to do next>"
}

Rules:
- "reasons" should be short phrases in English (for internal logging), max 4 items.
- "userMessage" must be in {LANGUAGE}, simple and non-technical, max 3 sentences.
- If verdict is "likely_scam" or "suspicious", userMessage must clearly recommend NOT sharing OTP/bank details and NOT sending money, and suggest reporting to the bank or via the app's Grievance layer if they already lost money.
- Never include backticks, markdown, or any text outside the JSON object.`;

// ── ML Pre-check via Python Flask API ─────────────────────────────────────────
const mlScamCheck = async (message) => {
  try {
    const ML_API = process.env.ML_API_URL;
    if (!ML_API) return null;
    const res = await axios.post(
      `${ML_API}/ml/scam`,
      { message },
      { timeout: 5000 } // 5 sec timeout — agar ML slow ho toh skip
    );
    return res.data;
  } catch (err) {
    // ML unavailable — Gemini alone handle karega
    console.warn("ML ScamCheck unavailable:", err.message);
    return null;
  }
};

/**
 * Analyzes a forwarded message for scam risk.
 * Uses ML model (fast, 90% accurate) + Gemini AI (detailed explanation) together.
 *
 * @param {string} userId
 * @param {string} messageText
 * @param {string} languageCode
 */
const askScamRadar = async (userId, messageText, languageCode = "hi") => {
  const languageName = LANGUAGE_NAMES[languageCode] || "Hindi";
  const systemPrompt = SYSTEM_PROMPT.replace(/{LANGUAGE}/g, languageName);

  // ── Step 1: ML fast check (parallel with log creation) ───────────────────
  let mlInsight = null;
  try {
    mlInsight = await mlScamCheck(messageText);
  } catch (e) {
    // silent fail — Gemini will handle alone
  }

  // ── Step 2: Create log ────────────────────────────────────────────────────
  const log = await AgentLog.create({
    user: userId,
    agent: "ScamRadar",
    inputText: messageText,
    inputLanguage: languageCode,
    status: "pending",
    metadata: { mlInsight },
  });

  try {
    // ── Step 3: Gemini detailed analysis ───────────────────────────────────
    const rawResponse = await askGemini(systemPrompt, messageText, { temperature: 0.1 });

    const cleaned = rawResponse.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      throw new Error("ScamRadar could not analyze this message. Please try again.");
    }

    // Basic shape validation
    if (
      typeof parsed.riskScore !== "number" ||
      !["safe", "suspicious", "likely_scam"].includes(parsed.verdict) ||
      !Array.isArray(parsed.reasons) ||
      typeof parsed.userMessage !== "string"
    ) {
      throw new Error("ScamRadar returned an unexpected response format.");
    }

    // ── Step 4: Combine ML + Gemini results ────────────────────────────────
    // Agar ML aur Gemini dono scam bol rahe hain — HIGH confidence
    let finalRiskScore = parsed.riskScore;
    if (mlInsight?.is_scam && parsed.verdict !== "safe") {
      finalRiskScore = Math.min(100, parsed.riskScore + 10); // boost confidence
    }
    // Agar ML safe bol raha hai aur Gemini bhi safe — extra reassurance
    if (!mlInsight?.is_scam && parsed.verdict === "safe") {
      finalRiskScore = Math.max(0, parsed.riskScore - 5);
    }

    log.outputText = parsed.userMessage;
    log.status = "completed";
    log.metadata = {
      riskScore: finalRiskScore,
      verdict: parsed.verdict,
      reasons: parsed.reasons,
      mlInsight,                    // ML result saved for analysis
      mlAgreesWithGemini: mlInsight
        ? mlInsight.is_scam === (parsed.verdict !== "safe")
        : null,
    };
    await log.save();

    return {
      riskScore: finalRiskScore,
      verdict: parsed.verdict,
      reasons: parsed.reasons,
      userMessage: parsed.userMessage,
      mlInsight,
      logId: log._id,
    };
  } catch (error) {
    log.status = "failed";
    log.metadata = { error: error.message };
    await log.save();
    throw error;
  }
};

module.exports = { askScamRadar };