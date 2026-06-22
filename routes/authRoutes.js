const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  updateConsent,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { registerValidation, loginValidation, updateProfileValidation } = require("../middleware/validators");

// Public routes
router.post("/register", registerValidation, registerUser);
router.post("/login", loginValidation, loginUser);

// Private routes (require a valid JWT)
router.get("/me", protect, getMe);
router.put("/me", protect, updateProfileValidation, updateProfile);
router.put("/consent", protect, updateConsent);
router.put("/change-password", protect, changePassword);

module.exports = router;