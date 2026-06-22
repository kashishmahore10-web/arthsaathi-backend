const { askGemini } = require("./geminiClient");
const AgentLog = require("../models/AgentLog");
const Transaction = require("../models/Transaction");

/**
 * PlannerBot — creates flexible budgets for irregular income patterns
 * (daily wage, gig work, seasonal farming income, etc.)
 *
 * Unlike GuideBot (which just answers a question), PlannerBot first PULLS the
 * user's real transaction history from MongoDB, summarizes it, and feeds that
 * summary into the prompt — so Gemini's advice is grounded in their actual
 * income/spending, not a generic answer.
 */

const LANGUAGE_NAMES = {
  hi: "Hindi", en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", pa: "Punjabi", or: "Odia",
};

/**
 * Pulls the user's last 90 days of transactions and produces a compact summary
 * (totals by type + category) that's cheap to send to Gemini as context.
 */
const buildFinancialSummary = async (userId) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const transactions = await Transaction.find({
    user: userId,
    date: { $gte: ninetyDaysAgo },
  }).sort({ date: -1 });

  if (transactions.length === 0) {
    return "No transaction history available yet. The user is new to tracking their finances on the app.";
  }

  const totals = { income: 0, expense: 0, saving: 0 };
  const byCategory = {};

  transactions.forEach((tx) => {
    totals[tx.type] = (totals[tx.type] || 0) + tx.amount;
    const key = `${tx.type}:${tx.category}`;
    byCategory[key] = (byCategory[key] || 0) + tx.amount;
  });

  const categoryLines = Object.entries(byCategory)
    .map(([key, amount]) => `  - ${key}: ₹${amount}`)
    .join("\n");

  return `Last 90 days summary (${transactions.length} transactions):
Total income: ₹${totals.income}
Total expenses: ₹${totals.expense}
Total savings: ₹${totals.saving}
Net: ₹${totals.income - totals.expense}

Breakdown by category:
${categoryLines}`;
};

const buildSystemPrompt = (languageCode, incomeType) => {
  const languageName = LANGUAGE_NAMES[languageCode] || "Hindi";

  return `You are PlannerBot, a budgeting assistant inside the ArthSaathi app, specifically designed for people with IRREGULAR income — daily wage workers, gig workers, farmers with seasonal income, and small vendors. The user's income type is recorded as: "${incomeType}".

Your job: help the user build a realistic, flexible budget plan based on their actual income and spending pattern (provided below), NOT a rigid fixed-monthly-budget template that assumes a steady salary.

Rules you must follow:
- Respond ONLY in ${languageName}.
- Acknowledge that their income is irregular — never assume a fixed monthly amount.
- Suggest a simple "good days / lean days" buffer strategy: save more on high-income days to cover low-income days, rather than a flat monthly savings percentage.
- Reference their actual numbers from the summary provided (e.g. "you spent ₹X on Y") so the advice feels personal, not generic.
- Suggest 2-3 concrete, small, achievable action steps — not abstract financial theory.
- Keep the tone warm and non-judgmental about spending patterns; never shame the user for any expense.
- Keep response to 4-8 short sentences plus the action steps as a short list.
- You are not a licensed financial advisor — frame suggestions as general guidance, not professional advice.`;
};

/**
 * Generates a personalized budget plan for the user based on their real transaction history.
 *
 * @param {object} user - Full user document (needs incomeType, preferredLanguage)
 * @param {string} [extraContext] - Optional extra note from the user (e.g. "I have a wedding next month")
 * @returns {Promise<{answer: string, logId: string, summaryUsed: string}>}
 */
const askPlannerBot = async (user, extraContext = "") => {
  const languageCode = user.preferredLanguage || "hi";
  const financialSummary = await buildFinancialSummary(user._id);

  const userPrompt = `${financialSummary}${
    extraContext ? `\n\nAdditional context from the user: ${extraContext}` : ""
  }\n\nBased on this, please create a simple budget plan for me.`;

  const log = await AgentLog.create({
    user: user._id,
    agent: "PlannerBot",
    inputText: extraContext || "Generate budget plan",
    inputLanguage: languageCode,
    status: "pending",
    metadata: { financialSummary },
  });

  try {
    const systemPrompt = buildSystemPrompt(languageCode, user.incomeType);
    const answer = await askGemini(systemPrompt, userPrompt);

    log.outputText = answer;
    log.status = "completed";
    await log.save();

    return { answer, logId: log._id, summaryUsed: financialSummary };
  } catch (error) {
    log.status = "failed";
    log.metadata = { ...log.metadata, error: error.message };
    await log.save();
    throw error;
  }
};

module.exports = { askPlannerBot };
