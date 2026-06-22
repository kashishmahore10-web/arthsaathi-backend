const { askGemini } = require("./geminiClient");
const AgentLog = require("../models/AgentLog");

/**
 * GovBot — matches the user's profile to government schemes they may be
 * eligible for (PM-KISAN, PMJDY, Kisan Credit Card, EPF, disability benefits, etc.)
 * and explains the application process in simple language.
 *
 * Note: Gemini's training data may not have the latest scheme details (eligibility
 * criteria, deadlines change). For the hackathon demo this is fine — it's "Phase 2
 * AI-only" mode. A production version would pair this with a verified, manually
 * curated scheme database and use Gemini only to match + explain, not to recall
 * raw facts. We flag that distinction in the prompt so the AI stays cautious.
 */

const LANGUAGE_NAMES = {
  hi: "Hindi", en: "English", mr: "Marathi", bn: "Bengali", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", pa: "Punjabi", or: "Odia",
};

const buildUserProfileSummary = (user) => {
  return `User profile:
- Gender: ${user.gender || "not specified"}
- Income type: ${user.incomeType || "not specified"}
- Member of a Self-Help Group (SHG): ${user.isInSHG ? "Yes" : "No"}
- Location: ${user.location?.district || "unknown district"}, ${user.location?.state || "unknown state"} (${user.location?.isRural ? "rural" : "urban"} area)`;
};

const buildSystemPrompt = (languageCode) => {
  const languageName = LANGUAGE_NAMES[languageCode] || "Hindi";

  return `You are GovBot, an assistant inside the ArthSaathi app that helps users discover Indian government welfare schemes they may be eligible for (e.g. PM-KISAN, PMJDY/Jan Dhan Yojana, Kisan Credit Card, EPF, disability pensions, SHG-linked schemes, MUDRA loans, Ayushman Bharat, etc.) and explains how to apply, in simple steps.

Important honesty rule: scheme eligibility rules, amounts, and deadlines change over time and vary by state. You do NOT have guaranteed up-to-date information. So:
- Suggest schemes that are PLAUSIBLY relevant based on the user's profile, framed as "you may be eligible for X — please confirm at your nearest bank/CSC/Gram Panchayat office", never as a guaranteed fact.
- Always recommend the user verify current details at an official source (nearest Common Service Centre, bank branch, or the scheme's official government portal) before relying on the information.
- Never invent specific monetary amounts or deadlines you are not confident about — if unsure, say the amount/deadline should be confirmed locally rather than stating a specific number with false confidence.

Other rules:
- Respond ONLY in ${languageName}.
- List 2-4 most relevant schemes based on the user's profile (income type, SHG membership, location, gender).
- For each scheme: give a one-line plain-language description of who it's for, and a simple next step (e.g. "visit your nearest bank branch" or "ask your SHG coordinator").
- Keep the tone helpful and encouraging — many eligible people miss out on benefits simply because they don't know schemes exist.
- Keep the whole response concise — a short list, not an essay.`;
};

/**
 * Suggests government schemes relevant to the user's profile.
 *
 * @param {object} user - Full user document
 * @param {string} [specificQuestion] - Optional: a specific scheme/question the user asked about
 * @returns {Promise<{answer: string, logId: string}>}
 */
const askGovBot = async (user, specificQuestion = "") => {
  const languageCode = user.preferredLanguage || "hi";
  const profileSummary = buildUserProfileSummary(user);

  const userPrompt = specificQuestion
    ? `${profileSummary}\n\nThe user is specifically asking: "${specificQuestion}"`
    : `${profileSummary}\n\nWhat government schemes might I be eligible for?`;

  const log = await AgentLog.create({
    user: user._id,
    agent: "GovBot",
    inputText: specificQuestion || "General scheme eligibility check",
    inputLanguage: languageCode,
    status: "pending",
  });

  try {
    const systemPrompt = buildSystemPrompt(languageCode);
    const answer = await askGemini(systemPrompt, userPrompt);

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

module.exports = { askGovBot };
