const { askGemini } = require("./geminiClient");
const AgentLog = require("../models/AgentLog");
const Transaction = require("../models/Transaction");

/**
 * CreditPath — converts informal financial history (UPI transactions, SHG
 * repayments, irregular income records logged in the app) into a narrative
 * "credit identity" that explains the user's financial reliability to
 * institutions that don't have formal credit history for them.
 *
 * IMPORTANT scope note for Phase 2: a real Account Aggregator (AA) integration
 * (pulling actual UPI/bank data via RBI's AA framework) is a significant
 * separate integration — out of scope for the hackathon backend. This service
 * uses the Transaction data already logged in OUR app as a stand-in / proof of
 * concept for what CreditPath would generate once AA data is available.
 * We are explicit about this distinction in the output so it's not misrepresented
 * as a real bureau score.
 */

const LANGUAGE_NAMES = {
  hi: "Hindi", en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", pa: "Punjabi", or: "Odia",
};

const buildCreditNarrativeInput = async (userId) => {
  const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  const transactions = await Transaction.find({
    user: userId,
    date: { $gte: oneEightyDaysAgo },
  }).sort({ date: -1 });

  if (transactions.length === 0) {
    return {
      summaryText: "No transaction history available yet in the app.",
      consistencyScore: 0,
      transactionCount: 0,
    };
  }

  const incomeTx = transactions.filter((t) => t.type === "income");
  const savingTx = transactions.filter((t) => t.type === "saving");

  // Very simple consistency heuristic for the demo: how many distinct weeks
  // had at least one income entry, out of the weeks covered. Real CreditPath
  // would use actual AA-sourced cash flow regularity — this is a stand-in.
  const weeksWithIncome = new Set(
    incomeTx.map((t) => Math.floor(new Date(t.date).getTime() / (7 * 24 * 60 * 60 * 1000)))
  ).size;

  const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
  const totalSavings = savingTx.reduce((sum, t) => sum + t.amount, 0);

  return {
    summaryText: `Last 180 days: ${transactions.length} total entries. ${incomeTx.length} income entries across ${weeksWithIncome} distinct weeks, totaling ₹${totalIncome}. ${savingTx.length} savings entries totaling ₹${totalSavings}.`,
    consistencyScore: Math.min(weeksWithIncome * 4, 100), // rough demo heuristic, capped at 100
    transactionCount: transactions.length,
  };
};

const buildSystemPrompt = (languageCode) => {
  const languageName = LANGUAGE_NAMES[languageCode] || "Hindi";

  return `You are CreditPath, an assistant inside the ArthSaathi app that helps build a "credit identity narrative" for users who lack formal credit history — typically because their income comes from informal sources (daily wages, gig work, small vending) that traditional credit bureaus don't capture.

IMPORTANT: You are working from the user's self-logged transaction history in the ArthSaathi app, NOT a verified bank/UPI/Account Aggregator feed. You must be explicit about this limitation in your response — frame this as "a starting financial story" or "a step toward formal credit history", never as an official credit score or guaranteed loan eligibility.

Your job:
- Summarize the user's income/saving consistency in plain, encouraging language — this is the "story" a future lender or microfinance institution could see.
- Explain ONE concrete next step toward building real credit history (e.g. continuing to log transactions consistently, linking a bank account, asking their SHG about credit-linked savings, or exploring small MUDRA-type loans once they have more history).
- Be honest that more consistent history (logged over more months) will make this narrative stronger over time.
- Respond ONLY in ${languageName}.
- Keep the tone hopeful and constructive — many users may feel they have "no credit history" and feel that's a dead end; reassure them this app is helping build one.
- Keep response concise: 4-7 sentences.`;
};

/**
 * Generates a credit identity narrative based on the user's logged transaction history.
 *
 * @param {object} user - Full user document
 * @returns {Promise<{answer: string, consistencyScore: number, logId: string}>}
 */
const askCreditPath = async (user) => {
  const languageCode = user.preferredLanguage || "hi";
  const { summaryText, consistencyScore, transactionCount } = await buildCreditNarrativeInput(user._id);

  const log = await AgentLog.create({
    user: user._id,
    agent: "CreditPath",
    inputText: "Generate credit identity narrative",
    inputLanguage: languageCode,
    status: "pending",
    metadata: { summaryText, consistencyScore, transactionCount },
  });

  try {
    const systemPrompt = buildSystemPrompt(languageCode);
    const answer = await askGemini(systemPrompt, summaryText);

    log.outputText = answer;
    log.status = "completed";
    await log.save();

    return { answer, consistencyScore, logId: log._id };
  } catch (error) {
    log.status = "failed";
    log.metadata = { ...log.metadata, error: error.message };
    await log.save();
    throw error;
  }
};

module.exports = { askCreditPath };