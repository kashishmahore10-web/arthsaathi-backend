const mongoose = require("mongoose");
const { AGENT_TYPES } = require("../config/constants");

/**
 * Stores every interaction a user has with any of the AI agents
 * (GuideBot, PlannerBot, ScamRadar, etc).
 *
 * This is scaffolded in Phase 1 (schema only) so that in Phase 2, when we wire up
 * the OpenAI calls, each service just needs to call AgentLog.create({...}) —
 * no schema changes needed mid-hackathon.
 */
const agentLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    agent: {
      type: String,
      enum: AGENT_TYPES,
      required: true,
    },
    inputText: {
      type: String,
      required: true,
    },
    inputLanguage: {
      type: String,
      default: "hi",
    },
    outputText: {
      type: String,
    },
    // Free-form field for agent-specific structured results,
    // e.g. ScamRadar: { riskScore: 92, verdict: "likely_scam" }
    //      GovBot: { matchedSchemes: ["PM-KISAN", "PMJDY"] }
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

agentLogSchema.index({ user: 1, agent: 1, createdAt: -1 });

module.exports = mongoose.model("AgentLog", agentLogSchema);