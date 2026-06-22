const asyncHandler = require("express-async-handler");
const ErrorResponse = require("../utils/errorResponse");
const { askGuideBot } = require("../services/guideBotService");
const { askPlannerBot } = require("../services/plannerBotService");
const { askScamRadar } = require("../services/scamRadarService");
const { askGovBot } = require("../services/govBotService");
const AgentLog = require("../models/AgentLog");
const { askCoachBot } = require("../services/coachBotService");
const { askSakhiBot } = require("../services/sakhiBotService");
const { askWealthBot } = require("../services/wealthBotService");
const { askCreditPath } = require("../services/creditPathService");
const Transaction = require("../models/Transaction");


/**
 * @desc    Ask GuideBot a financial literacy question
 * @route   POST /api/agents/guidebot/ask
 * @access  Private
 * @body    { "question": "What is a SIP?", "language": "hi" }  (language is optional —
 *           defaults to the user's saved preferredLanguage if not provided)
 */
const askGuideBotController = asyncHandler(async (req, res) => {
  const { question, language } = req.body;

  if (!question || question.trim().length === 0) {
    throw new ErrorResponse("Question is required", 400);
  }

  const languageCode = language || req.user.preferredLanguage || "hi";

  const { answer, logId } = await askGuideBot(req.user._id, question, languageCode);

  res.status(200).json({
    success: true,
    data: {
      agent: "GuideBot",
      question,
      answer,
      language: languageCode,
      logId,
    },
  });
});

/**
 * @desc    Ask PlannerBot for a personalized budget plan based on real transaction history
 * @route   POST /api/agents/plannerbot/ask
 * @access  Private
 * @body    { "context": "I have a wedding next month" }  (context is optional free text)
 */
const askPlannerBotController = asyncHandler(async (req, res) => {
  const { context } = req.body;

  const { answer, logId, summaryUsed } = await askPlannerBot(req.user, context || "");

  res.status(200).json({
    success: true,
    data: {
      agent: "PlannerBot",
      answer,
      summaryUsed,
      logId,
    },
  });
});

/**
 * @desc    Ask ScamRadar to analyze a forwarded message/link for scam risk
 * @route   POST /api/agents/scamradar/check
 * @access  Private
 * @body    { "message": "Congratulations! You won...", "language": "hi" }
 */
const askScamRadarController = asyncHandler(async (req, res) => {
  const { message, language } = req.body;

  if (!message || message.trim().length === 0) {
    throw new ErrorResponse("Message text is required", 400);
  }

  const languageCode = language || req.user.preferredLanguage || "hi";

  const result = await askScamRadar(req.user._id, message, languageCode);

  res.status(200).json({
    success: true,
    data: {
      agent: "ScamRadar",
      ...result,
    },
  });
});

/**
 * @desc    Ask GovBot which government schemes the user may be eligible for
 * @route   POST /api/agents/govbot/ask
 * @access  Private
 * @body    { "question": "Am I eligible for PM-KISAN?" }  (question is optional)
 */
const askGovBotController = asyncHandler(async (req, res) => {
  const { question } = req.body;

  const { answer, logId } = await askGovBot(req.user, question || "");

  res.status(200).json({
    success: true,
    data: {
      agent: "GovBot",
      question: question || null,
      answer,
      logId,
    },
  });
});

/**
 * @desc    Get the logged-in user's past conversations with a specific agent (or all agents)
 * @route   GET /api/agents/history?agent=GuideBot&limit=20
 * @access  Private
 */
const getAgentHistory = asyncHandler(async (req, res) => {
  const { agent, limit } = req.query;

  const filter = { user: req.user._id };
  if (agent) filter.agent = agent;

  const history = await AgentLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(parseInt(limit, 10) || 20, 100)); // cap at 100 to avoid huge payloads

  res.status(200).json({
    success: true,
    count: history.length,
    data: history,
  });
});


const askCoachBotController = asyncHandler(async (req, res) => {
  const { language } = req.body;
  const languageCode = language || req.user.preferredLanguage || "hi";
  const { answer, logId } = await askCoachBot(req.user, languageCode);
  res.status(200).json({ success: true, data: { agent: "CoachBot", answer, logId } });
});

const askSakhiBotController = asyncHandler(async (req, res) => {
  const { question, language } = req.body;
  if (!question || question.trim().length === 0) throw new ErrorResponse("Question is required", 400);
  const languageCode = language || req.user.preferredLanguage || "hi";
  const { answer, logId } = await askSakhiBot(req.user, question, languageCode);
  res.status(200).json({ success: true, data: { agent: "SakhiBot", question, answer, logId } });
});

const askWealthBotController = asyncHandler(async (req, res) => {
  const { answer, totalSaved, logId } = await askWealthBot(req.user);
  res.status(200).json({ success: true, data: { agent: "WealthBot", answer, totalSaved, logId } });
});

const askCreditPathController = asyncHandler(async (req, res) => {
  const { answer, logId } = await askCreditPath(req.user);
  res.status(200).json({ success: true, data: { agent: "CreditPath", answer, logId } });
});

const getHealthScore = asyncHandler(async (req, res) => {
  const results = await Transaction.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  const summary = { income: 0, expense: 0, saving: 0, savingCount: 0 };
  results.forEach((r) => {
    summary[r._id] = r.total;
    if (r._id === "saving") summary.savingCount = r.count;
  });
  const score = Math.min(100, Math.round(
    (summary.saving > 0 ? 25 : 0) +
    (summary.savingCount * 3) +
    (summary.income > summary.expense ? 25 : 0) +
    (req.user.isInSHG ? 15 : 0) +
    (req.user.consent?.dataProcessing ? 10 : 0) +
    Math.min(summary.savingCount * 2, 25)
  ));
  const level = score >= 75 ? "Excellent" : score >= 50 ? "Good" : score >= 25 ? "Building" : "Starting";
  await User.findByIdAndUpdate(req.user._id, { financialHealthScore: score });
  res.status(200).json({ success: true, data: { score, level, summary } });
});
module.exports = {
  askGuideBotController,
  askPlannerBotController,
  askScamRadarController,
  askGovBotController,
  askCoachBotController,
  askSakhiBotController,
  askWealthBotController,
  askCreditPathController,
  getHealthScore,
  getAgentHistory,
};
