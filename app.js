const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const agentRoutes = require("./routes/agentRoutes");

const app = express();

// --- Security & utility middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" })); // 10mb to leave room for future voice-note base64 payloads
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// --- Basic rate limiting to protect auth endpoints from brute force ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { success: false, message: "Too many requests, please try again later" },
});
app.use("/api/auth", authLimiter);

// --- Health check (useful for hackathon demo + uptime checks) ---
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ArthSaathi API is running",
    timestamp: new Date().toISOString(),
  });
});

// --- Mount routes ---
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/agents", agentRoutes);

// --- 404 + central error handler (must be last) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;