const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB, then start the server.
// We deliberately connect first so the app never accepts traffic without a DB.
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 ArthSaathi API running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });

  // Gracefully handle unexpected promise rejections instead of crashing silently
  process.on("unhandledRejection", (err) => {
    console.error(`❌ Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
});