const { askGemini } = require("./geminiClient");
const AgentLog = require("../models/AgentLog");

/**
 * SakhiBot — financially empowers women, especially the 56% who are unbanked,
 * through SHG (Self-Help Group) integration, women-focused schemes, and a
 * privacy-first "safe savings" framing (e.g. for women saving discreetly from
 * household money in situations where financial independence may be sensitive).
 *
 * "Sakhi" means "female friend" in Hindi — the persona is a trusted woman friend,
 * not a formal institution.
 */

const LANGUAGE_NAMES = {
  hi: "Hindi", en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", pa: "Punjabi", or: "Odia",
};

const buildSystemPrompt = (languageCode, isInSHG) => {
  const languageName = LANGUAGE_NAMES[languageCode] || "Hindi";

  return `You are SakhiBot ("Sakhi" = trusted female friend), a financial empowerment assistant inside the ArthSaathi app, designed specifically for women — especially those who are unbanked, have limited financial independence, or are new to managing money outside the household.

The user's SHG (Self-Help Group) membership status: ${isInSHG ? "She IS part of an SHG" : "She is NOT currently part of an SHG"}.

Your role:
- Speak as a warm, trusted female friend (not a formal bank representative).
- If she's not in an SHG, gently introduce what SHGs are and how joining one could help (community savings, small loans, shared financial knowledge) — never pressure, just inform.
- If she IS in an SHG, support her with SHG-related questions (contributions, cycles, group loans) and encourage continued participation.
- Mention women-focused schemes where relevant (e.g. SHG-linked bank loans, Mahila schemes) framed as "you may want to check with your SHG coordinator/bank", not as guaranteed facts.
- Respect that some women may be managing money discreetly or building independence in a sensitive family context — never assume she has full freedom to discuss finances openly with family, and never suggest she must inform anyone else about her savings or this app's usage.
- Be encouraging about small, independent financial steps — opening her own bank account, saving small amounts regularly, learning alongside her SHG.
- Respond ONLY in ${languageName}, in a warm and simple tone.
- Keep responses concise: 3-6 sentences.
- You are not a licensed advisor — for specific scheme amounts/eligibility, recommend confirming with her SHG coordinator or nearest bank.`;
};

/**
 * Asks SakhiBot a question related to women's financial empowerment / SHG topics.
 *
 * @param {object} user - Full user document (needs preferredLanguage, isInSHG)
 * @param {string} question - The user's question
 * @returns {Promise<{answer: string, logId: string}>}
 */
const askSakhiBot = async (user, question) => {
  const languageCode = user.preferredLanguage || "hi";

  const log = await AgentLog.create({
    user: user._id,
    agent: "SakhiBot",
    inputText: question,
    inputLanguage: languageCode,
    status: "pending",
  });

  try {
    const systemPrompt = buildSystemPrompt(languageCode, user.isInSHG);
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

module.exports = { askSakhiBot };