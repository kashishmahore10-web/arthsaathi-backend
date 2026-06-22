const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { INCOME_TYPES, USER_ROLES, GENDER_OPTIONS, SUPPORTED_LANGUAGES } = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },

    // Email + password is the Phase 1 auth method (kept simple for the hackathon demo).
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never return password by default in queries
    },

    // Phone is stored now (and validated) so Phase 2/3 can layer OTP login on top
    // without a schema migration. Not required yet, but unique if provided.
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // allows multiple docs with phone: null/undefined
      match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number"],
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: USER_ROLES,
      default: "user",
    },

    // --- Profile fields relevant to ArthSaathi's mission ---
    preferredLanguage: {
      type: String,
      enum: SUPPORTED_LANGUAGES,
      default: "hi",
    },
    gender: {
      type: String,
      enum: GENDER_OPTIONS,
      default: "prefer_not_to_say",
    },
    incomeType: {
      // Feeds PlannerBot's irregular-income-aware budgeting engine
      type: String,
      enum: INCOME_TYPES,
      default: "irregular",
    },
    isInSHG: {
      // Self-Help Group membership — relevant for SakhiBot
      type: Boolean,
      default: false,
    },
    location: {
      state: { type: String, trim: true },
      district: { type: String, trim: true },
      isRural: { type: Boolean, default: true },
    },

    // Financial Health Score (Feature 7) — starts at a neutral baseline
    financialHealthScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    // Trust-First Architecture (Feature 8): explicit, auditable consent flags
    consent: {
      dataProcessing: { type: Boolean, default: false },
      voiceRecording: { type: Boolean, default: false },
      consentTimestamp: { type: Date },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt automatically
  }
);

// --- Hash password before saving, only if it was modified ---
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// --- Instance method: compare plaintext password to hashed password ---
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// --- Instance method: return a safe, public-facing version of the user ---
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    isPhoneVerified: this.isPhoneVerified,
    role: this.role,
    preferredLanguage: this.preferredLanguage,
    incomeType: this.incomeType,
    isInSHG: this.isInSHG,
    location: this.location,
    financialHealthScore: this.financialHealthScore,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);