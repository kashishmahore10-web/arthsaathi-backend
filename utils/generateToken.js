const jwt = require("jsonwebtoken");

/**
 * Generates a short-lived access token containing the user's id and role.
 * Used on login/register, and to authenticate subsequent requests.
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * Generates a longer-lived refresh token.
 * Useful later for the mobile app (React Native) so users aren't forced
 * to log in again every few days.
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
};

module.exports = { generateAccessToken, generateRefreshToken };