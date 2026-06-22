const { askGemini } = require("./geminiClient");
const AgentLog = require("../models/AgentLog");
const Transaction = require("../models/Transaction");

/**
 * CoachBot — encourages healthy financial habits through personalized nudges.
 *
 * Unlike PlannerBot (which builds a full budget), CoachBot is meant for quick,
 * frequent check-ins: "how am I doing", daily motivation, small wins to celebrate.
 * It looks at recent activity (last 7 days) to keep nudges relevant and current.
 */

const LANGUAGE_NAMES = {
  hi: "Hindi", en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", pa: "Punjabi", or: "Odia",
};

const buildRecentActivitySummary = async (userId) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const transactions = await Transaction.find({
    user: userId,
    date: { $gte: sevenDaysAgo },
  }).sort({ date: -1 });

  if (transactions.length === 0) {
    return "No activity logged in the last 7 days.";
  }

  const totals = { income: 0, expense: 0, saving: 0 };
  transactions.forEach((tx) => {
    totals[tx.type] = (totals[tx.type] || 0) + tx.amount;
  });

  return `Last 7 days: ${transactions.length} transactions logged. Income: ₹${totals.income}, Expenses: ₹${totals.expense}, Savings: ₹${totals.saving}.`;
};

const buildSystemPrompt = (languageCode, financialHealthScore) => {
  const languageName = LANGUAGE_NAMES[languageCode] || "Hindi";

  return `You are CoachBot, a warm and encouraging financial habit coach inside the ArthSaathi app. Your job is NOT to give detailed financial advice (that's PlannerBot's job) — it's to give short, motivating check-ins that build good money habits over time, like a supportive friend would.

The user's current Financial Health Score is ${financialHealthScore}/100 (a relative score reflecting their saving/spending consistency, not a credit score).

Rules you must follow:
- Respond ONLY in ${languageName}.
- Be brief: 2-4 short sentences, like a friendly text message, not an essay.
- Always find something genuine to celebrate or acknowledge first, even if small (e.g. "you logged your expenses 3 days this week — that's a great habit forming!").
- Give ONE small, specific, achievable suggestion for the next few days — not a long list.
- Never shame, guilt-trip, or use alarming language about money habits.
- Use an encouraging, casual, warm tone — like a supportive friend, not a bank or auditor.`;
};

/**
 * Generates a short motivational check-in / nudge for the user.
 *
 * @param {object} user - Full user document (needs preferredLanguage, financialHealthScore)
 * @returns {Promise<{answer: string, logId: string}>}
 */
const askCoachBot = async (user) => {
  const languageCode = user.preferredLanguage || "hi";
  const activitySummary = await buildRecentActivitySummary(user._id);

  const log = await AgentLog.create({
    user: user._id,
    agent: "CoachBot",
    inputText: "Daily check-in",
    inputLanguage: languageCode,
    status: "pending",
    metadata: { activitySummary },
  });

  try {
    const systemPrompt = buildSystemPrompt(languageCode, user.financialHealthScore);
    const answer = await askGemini(systemPrompt, activitySummary, { temperature: 0.6 });

    log.outputText = answer;
    log.status = "completed";
    await log.save();

    return { answer, logId: log._id };
  } catch (error) {
    log.status = "failed";
    log.metadata = { ...log.metadata, error: error.message };
    await log.save();
    throw error;
  }
};

module.exports = { askCoachBot };