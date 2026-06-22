const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const { protect } = require("../middleware/authMiddleware");
const { AGENT_TYPES } = require("../config/constants");
const {
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
} = require("../controllers/agentController");

const LIVE_AGENTS = ["GuideBot", "PlannerBot", "ScamRadar", "GovBot", "CoachBot", "SakhiBot", "WealthBot", "CreditPath"];

router.get("/", protect, asyncHandler(async (req, res) => {
  const agents = AGENT_TYPES.map((name) => ({
    name,
    status: LIVE_AGENTS.includes(name) ? "live" : "coming_soon",
  }));
  res.status(200).json({ success: true, count: agents.length, data: agents });
}));

router.post("/guidebot/ask", protect, askGuideBotController);
router.post("/plannerbot/ask", protect, askPlannerBotController);
router.post("/scamradar/check", protect, askScamRadarController);
router.post("/govbot/ask", protect, askGovBotController);
router.post("/coachbot/ask", protect, askCoachBotController);
router.post("/sakhibot/ask", protect, askSakhiBotController);
router.post("/wealthbot/ask", protect, askWealthBotController);
router.post("/creditpath/ask", protect, askCreditPathController);
router.get("/health-score", protect, getHealthScore);
router.get("/history", protect, getAgentHistory);

module.exports = router;