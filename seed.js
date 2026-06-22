/**
 * Seed script — populates the database with one demo user and a handful of
 * realistic transactions, so you have something to show judges immediately
 * without manually registering and clicking through the API.
 *
 * Run with: npm run seed
 */
const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

const seed = async () => {
  await connectDB();

  console.log("🌱 Clearing existing demo data...");
  await User.deleteMany({ email: "demo@arthsaathi.in" });

  console.log("🌱 Creating demo user...");
  const user = await User.create({
    name: "Sunita Devi",
    email: "demo@arthsaathi.in",
    password: "demo1234",
    phone: "9876543210",
    preferredLanguage: "hi",
    incomeType: "daily_wage",
    isInSHG: true,
    location: { state: "Madhya Pradesh", district: "Bhopal", isRural: true },
    financialHealthScore: 42,
  });

  console.log("🌱 Creating sample transactions...");
  const sampleTransactions = [
    { type: "income", category: "daily_wage", amount: 350, note: "Construction site work", source: "manual" },
    { type: "income", category: "SHG_payout", amount: 500, note: "Monthly SHG cycle payout", source: "manual" },
    { type: "expense", category: "groceries", amount: 220, note: "Weekly rations", source: "manual" },
    { type: "expense", category: "school_fees", amount: 150, note: "Daughter's school fee", source: "manual" },
    { type: "saving", category: "SIP", amount: 100, note: "First SIP via WealthBot nudge", source: "agent" },
  ];

  for (const tx of sampleTransactions) {
    await Transaction.create({ ...tx, user: user._id });
  }

  console.log("✅ Seed complete!");
  console.log("   Login with: demo@arthsaathi.in / demo1234");

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});