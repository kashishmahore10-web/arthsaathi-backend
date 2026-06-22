const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const Transaction = require("../models/Transaction");

const connectDB = require("../config/db");

const seed = async () => {
  await connectDB();

  await User.deleteMany({});
  await Transaction.deleteMany({});

  const users = await User.insertMany([
    {
      name: "Ramesh Kumar",
      email: "ramesh@demo.com",
      password: await bcrypt.hash("demo1234", 10),
      phone: "9876543210",
      preferredLanguage: "hi",
      incomeType: "daily_wage",
      isInSHG: false,
      location: { state: "Madhya Pradesh", district: "Bhopal", isRural: true },
      financialHealthScore: 32,
      consent: { dataProcessing: true, voiceRecording: false, consentTimestamp: new Date() },
    },
    {
      name: "Sunita Devi",
      email: "sunita@demo.com",
      password: await bcrypt.hash("demo1234", 10),
      phone: "9876543211",
      preferredLanguage: "hi",
      incomeType: "irregular",
      isInSHG: true,
      gender: "female",
      location: { state: "Uttar Pradesh", district: "Lucknow", isRural: true },
      financialHealthScore: 58,
      consent: { dataProcessing: true, voiceRecording: true, consentTimestamp: new Date() },
    },
    {
      name: "Kisan Singh",
      email: "kisan@demo.com",
      password: await bcrypt.hash("demo1234", 10),
      phone: "9876543212",
      preferredLanguage: "hi",
      incomeType: "seasonal",
      isInSHG: false,
      location: { state: "Punjab", district: "Ludhiana", isRural: true },
      financialHealthScore: 45,
      consent: { dataProcessing: true, voiceRecording: false, consentTimestamp: new Date() },
    },
  ]);

  const txns = [];
  const now = new Date();

  users.forEach((user, i) => {
    for (let d = 30; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      if (d % 3 === 0) txns.push({ user: user._id, type: "income", category: "gig_payment", amount: 300 + i * 50 + Math.floor(Math.random() * 100), date, source: "manual" });
      if (d % 4 === 0) txns.push({ user: user._id, type: "expense", category: "groceries", amount: 80 + Math.floor(Math.random() * 60), date, source: "manual" });
      if (d % 7 === 0) txns.push({ user: user._id, type: "saving", category: "SHG_contribution", amount: 50 + i * 20, date, source: "manual" });
    }
  });

  await Transaction.insertMany(txns);

  console.log("✅ Seed complete! Demo users:");
  console.log("   ramesh@demo.com / demo1234 (daily wage worker)");
  console.log("   sunita@demo.com / demo1234 (SHG woman, irregular income)");
  console.log("   kisan@demo.com  / demo1234 (seasonal farmer)");
  process.exit(0);
};

seed().catch((e) => { console.error(e); process.exit(1); });