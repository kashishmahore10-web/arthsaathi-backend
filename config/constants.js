/**
 * Central place for app-wide constants.
 * Keeping these here avoids "magic strings" scattered across models/controllers,
 * and makes it easy to add new agents/languages/schemes later without hunting through files.
 */

module.exports = {
  // Languages supported by the voice-first multilingual interface (Phase 3+)
  SUPPORTED_LANGUAGES: [
    "hi", // Hindi
    "en", // English
    "mr", // Marathi
    "bn", // Bengali
    "ta", // Tamil
    "te", // Telugu
    "gu", // Gujarati
    "kn", // Kannada
    "pa", // Punjabi
    "or", // Odia
  ],

  // Income pattern types for PlannerBot (irregular income engine)
  INCOME_TYPES: ["fixed", "irregular", "seasonal", "daily_wage", "gig"],

  // The multi-agent roster — used for routing requests to the right AI agent
  AGENT_TYPES: [
    "GuideBot",
    "PlannerBot",
    "ScamRadar",
    "GovBot",
    "CoachBot",
    "SakhiBot",
    "CreditPath",
    "WealthBot",
    "GuardBot",
  ],

  USER_ROLES: ["user", "admin", "bc_agent"], // bc_agent = Business Correspondent (Grievance Layer)

  GENDER_OPTIONS: ["male", "female", "other", "prefer_not_to_say"],

  JWT_COOKIE_NAME: "arthsaathi_token",
};