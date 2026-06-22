const { askGemini } = require("./geminiClient");
const AgentLog = require("../models/AgentLog");

/**
 * GuardBot — the "always-on financial immune system" per the executive summary.
 *
 * Distinction from ScamRadar:
 *  - ScamRadar = REACTIVE, single-message analysis ("is THIS specific message a scam?")
 *  - GuardBot = PROACTIVE safety companion — general fraud-safety guidance, what to
 *    watch out for, what to do if something already went wrong, and broader account
 *    safety habits (not tied to one forwarded message).
 *
 * In a full production build, GuardBot would also passively monitor linked account
 * activity for anomalies. That requires the Account Aggregator integration (same
 * dependency noted in CreditPath) — out of scope for this hackathon backend. Here,
 * GuardBot operates as an on-demand safety advisor users can talk to anytime.
 */

const LANGUAGE_NAMES = {
  hi: "Hindi", en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", pa: "Punjabi", or: "Odia",
};

const buildSystemPrompt = (languageCode) => {
  const languageName = LANGUAGE_NAMES[languageCode] || "Hindi";

  return `You are GuardBot, the always-on financial safety guardian inside the ArthSaathi app. Unlike ScamRadar (which checks one specific forwarded message), you are a general safety companion users can talk to anytime about financial fraud risks, account safety habits, or what to do if they suspect they've already been scammed.

Your responsibilities:
- Answer general questions about staying safe from financial fraud (e.g. "should I ever share my OTP?", "how do I know if a loan app is real?", "someone called claiming to be from my bank, what should I do?").
- If the user indicates they may have ALREADY lost money or shared sensitive details (OTP, PIN, full card number), prioritize urgent, calm, practical guidance: contact their bank's fraud helpline immediately, consider blocking the card/account, and use the app's Grievance & Escalation layer to reach a human BC agent or, if needed, the RBI Ombudsman.
- Reinforce simple, memorable safety habits (never share OTP/PIN with anyone including "bank employees", banks never ask for OTP over a call, verify loan apps are RBI-registered, etc.)
- Respond ONLY in ${languageName}.
- Keep the tone calm and reassuring, especially if the user seems anxious or panicked — never add to their fear, be a steady, clear-headed guide.
- Keep responses concise: 3-6 sentences, unless the situation is urgent and needs a clear step-by-step response.
- You are not a law enforcement or banking official — for active fraud/loss situations, always direct them to their bank's official fraud helpline and the app's Grievance layer as the authoritative next step.`;
};

/**
 * Asks GuardBot a general fraud-safety question or reports a potential incident.
 *
 * @param {string} userId - Mongo ObjectId of the user
 * @param {string} question - The user's question or description of what happened
 * @param {string} languageCode - Preferred language
 * @returns {Promise<{answer: string, logId: string}>}
 */
const askGuardBot = async (userId, question, languageCode = "hi") => {
  const log = await AgentLog.create({
    user: userId,
    agent: "GuardBot",
    inputText: question,
    inputLanguage: languageCode,
    status: "pending",
  });

  try {
    const systemPrompt = buildSystemPrompt(languageCode);
    const answer = await askGemini(systemPrompt, question, { temperature: 0.3 });

    log.outputText = answer;
    log.status = "completed";
    await log.save();

    return { answer, logId: log._id };
  } catch (error) {
    log.status = "failed";
    log.metadata = { error: error.message };
    await log.save();
    throw error;
  }
};

module.exports = { askGuardBot };