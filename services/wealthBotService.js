const { askGemini } = require("./geminiClient");
const AgentLog = require("../models/AgentLog");
const Transaction = require("../models/Transaction");

/**
 * WealthBot — guides users from tiny, irregular savings toward their first
 * real investment (SIP, recurring deposit, etc.), one small celebrated step
 * at a time. Per the executive summary: "A landless farmer shouldn't die
 * without a pension. WealthBot walks him from saving ₹10 today to his first
 * SIP tomorrow."
 *
 * This is distinct from PlannerBot (budgeting day-to-day cash flow) — WealthBot
 * is specifically about the LONG-TERM wealth-building journey and milestones.
 */

const LANGUAGE_NAMES = {
  hi: "Hindi", en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", pa: "Punjabi", or: "Odia",
};

const buildSavingsJourneySummary = async (userId) => {
  const savings = await Transaction.find({ user: userId, type: "saving" }).sort({ date: 1 });

  if (savings.length === 0) {
    return { summaryText: "User has not logged any savings yet — this would be their very first step.", totalSaved: 0, savingsCount: 0 };
  }

  const totalSaved = savings.reduce((sum, t) => sum + t.amount, 0);
  const firstDate = savings[0].date;
  const daysSinceFirst = Math.max(1, Math.floor((Date.now() - new Date(firstDate).getTime()) / (24 * 60 * 60 * 1000)));

  return {
    summaryText: `User has logged ${savings.length} savings entries totaling ₹${totalSaved} over the last ${daysSinceFirst} days.`,
    totalSaved,
    savingsCount: savings.length,
  };
};

const buildSystemPrompt = (languageCode) => {
  const languageName = LANGUAGE_NAMES[languageCode] || "Hindi";

  return `You are WealthBot, an assistant inside the ArthSaathi app whose mission is to guide users — especially those with very low or irregular income (daily wage workers, landless farmers, small vendors) — on a long-term wealth-building journey, one tiny achievable step at a time.

Your philosophy: it does not matter how small the amount is. Saving ₹10 today is worth celebrating. The goal is building the HABIT first, then gradually introducing slightly bigger steps (a recurring deposit, eventually a small SIP) — never overwhelming the user with big numbers or long-term jargon upfront.

Rules you must follow:
- Respond ONLY in ${languageName}.
- Always start by celebrating whatever progress the user has made so far, however small.
- Suggest exactly ONE next small step — never a long roadmap. If they have no savings yet, the step should be as small as "try saving just ₹10-20 this week."
- Only mention formal investment products (SIP, recurring deposit, mutual funds) once the user has shown some saving consistency — for someone with zero logged savings, focus entirely on starting the habit, not investment products.
- Use simple, hopeful language and relatable comparisons (seeds growing, small streams becoming rivers, etc.) rather than financial jargon.
- Keep response concise: 3-6 sentences.
- You are not a licensed financial advisor — frame any investment mention as something to explore with a bank or SEBI-registered advisor once they're ready.`;
};

/**
 * Generates the next step in the user's wealth-building journey.
 *
 * @param {object} user - Full user document
 * @returns {Promise<{answer: string, totalSaved: number, logId: string}>}
 */
const askWealthBot = async (user) => {
  const languageCode = user.preferredLanguage || "hi";
  const { summaryText, totalSaved, savingsCount } = await buildSavingsJourneySummary(user._id);

  const log = await AgentLog.create({
    user: user._id,
    agent: "WealthBot",
    inputText: "Get next wealth-building step",
    inputLanguage: languageCode,
    status: "pending",
    metadata: { summaryText, totalSaved, savingsCount },
  });

  try {
    const systemPrompt = buildSystemPrompt(languageCode);
    const answer = await askGemini(systemPrompt, summaryText, { temperature: 0.5 });

    log.outputText = answer;
    log.status = "completed";
    await log.save();

    return { answer, totalSaved, logId: log._id };
  } catch (error) {
    log.status = "failed";
    log.metadata = { ...log.metadata, error: error.message };
    await log.save();
    throw error;
  }
};

module.exports = { askWealthBot };