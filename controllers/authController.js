const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, preferredLanguage, incomeType, location } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ErrorResponse("An account with this email already exists", 400);
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    preferredLanguage,
    incomeType,
    location,
  });

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: user.toPublicJSON(),
    accessToken,
    refreshToken,
  });
});

/**
 * @desc    Login an existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // password has `select: false` in the schema, so we explicitly request it here
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    throw new ErrorResponse("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new ErrorResponse("This account has been deactivated. Contact support.", 403);
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: user.toPublicJSON(),
    accessToken,
    refreshToken,
  });
});

/**
 * @desc    Get the currently logged-in user's profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  // req.user is attached by the `protect` middleware
  res.status(200).json({
    success: true,
    data: req.user.toPublicJSON(),
  });
});

/**
 * @desc    Update the logged-in user's profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "name",
    "preferredLanguage",
    "incomeType",
    "isInSHG",
    "location",
    "gender",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser.toPublicJSON(),
  });
});

/**
 * @desc    Update consent flags (Trust-First Architecture)
 * @route   PUT /api/auth/consent
 * @access  Private
 */
const updateConsent = asyncHandler(async (req, res) => {
  const { dataProcessing, voiceRecording } = req.body;

  req.user.consent = {
    dataProcessing: !!dataProcessing,
    voiceRecording: !!voiceRecording,
    consentTimestamp: new Date(),
  };

  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Consent preferences updated",
    data: req.user.consent,
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ErrorResponse("Current and new password are required", 400);
  }
  if (newPassword.length < 6) {
    throw new ErrorResponse("New password must be at least 6 characters", 400);
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    throw new ErrorResponse("Current password is incorrect", 401);
  }

  user.password = newPassword; // pre-save hook will hash it
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  updateConsent,
  changePassword,
};