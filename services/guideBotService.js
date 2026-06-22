const { askGemini } = require("./geminiClient");
const AgentLog = require("../models/AgentLog");

/**
 * GuideBot — simplifies financial concepts in the user's preferred regional language.
 *
 * This is the first of the 9 agents to go live. The pattern here (build prompt →
 * call Gemini → log to AgentLog → return clean result) is the template every
 * other agent service (PlannerBot, ScamRadar, GovBot...) will follow.
 */

const LANGUAGE_NAMES = {
  hi: "Hindi",
  en: "English",
  mr: "Marathi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  gu: "Gujarati",
  kn: "Kannada",
  pa: "Punjabi",
  or: "Odia",
};

const buildSystemPrompt = (languageCode) => {
  const languageName = LANGUAGE_NAMES[languageCode] || "Hindi";

  return `You are GuideBot, a friendly financial literacy assistant for ArthSaathi, a platform serving everyday Indians — including daily wage workers, gig workers, and people with little to no formal financial education.

Your job: explain financial concepts (savings, loans, interest, insurance, government schemes, banking, investments, etc.) in extremely simple, jargon-free language.

Rules you must follow:
- Always respond in ${languageName}, written in a script the user can read naturally (use Devanagari for Hindi, not romanized text, unless the user writes in romanized script first).
- Use short sentences and everyday analogies (e.g. comparing compound interest to a snowball) rather than technical definitions.
- Never assume the user can read complex numbers or financial tables — explain things narratively.
- If the user asks something outside financial literacy (e.g. medical advice, legal disputes unrelated to finance), gently redirect them back to financial topics or suggest they consult an appropriate expert.
- Keep responses concise — 3 to 6 sentences unless the user asks for more detail.
- Be warm and encouraging. Many users may feel embarrassed about not understanding money matters — never make them feel judged.`;
};

/**
 * Sends a user's question to GuideBot and logs the interaction.
 *
 * @param {string} userId - MongoDB ObjectId of the user asking
 * @param {string} question - The user's question, in any language
 * @param {string} languageCode - Preferred language code (e.g. "hi", "en", "ta")
 * @returns {Promise<{answer: string, logId: string}>}
 */
const askGuideBot = async (userId, question, languageCode = "hi") => {
  if (!question || question.trim().length === 0) {
    throw new Error("Question cannot be empty");
  }

  // Create a "pending" log first, so even if Gemini fails, we have a record of the attempt.
  const log = await AgentLog.create({
    user: userId,
    agent: "GuideBot",
    inputText: question,
    inputLanguage: languageCode,
    status: "pending",
  });

  try {
    const systemPrompt = buildSystemPrompt(languageCode);
    const answer = await askGemini(systemPrompt, question);

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

module.exports = { askGuideBot };
