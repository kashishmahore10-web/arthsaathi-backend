const mongoose = require("mongoose");

/**
 * Tracks income & expenses per user.
 * This is the raw data PlannerBot (Phase 2) will use to build flexible budgets
 * for irregular income, and what feeds the Financial Health Score.
 */
const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense", "saving"],
      required: true,
    },
    category: {
      // e.g. "groceries", "gig_payment", "SHG_contribution", "loan_repayment"
      type: String,
      trim: true,
      default: "uncategorized",
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    note: {
      type: String,
      trim: true,
      maxlength: 250,
    },
    source: {
      // how this entry was created — useful once voice/SMS input lands in Phase 3
      type: String,
      enum: ["manual", "voice", "sms", "ussd", "agent"],
      default: "manual",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);