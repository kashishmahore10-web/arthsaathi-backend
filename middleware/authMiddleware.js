const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Protects routes by verifying the JWT sent in the Authorization header.
 * Accepts: "Authorization: Bearer <token>"
 * On success, attaches the full user document (minus password) to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ErrorResponse("Not authorized, no token provided", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ErrorResponse("User belonging to this token no longer exists", 401);
    }
    if (!user.isActive) {
      throw new ErrorResponse("This account has been deactivated", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      throw new ErrorResponse("Not authorized, token failed or expired", 401);
    }
    throw error;
  }
});

/**
 * Restricts a route to specific roles.
 * Usage: router.delete("/:id", protect, authorize("admin"), deleteUser);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ErrorResponse(`Role '${req.user.role}' is not authorized to access this route`, 403);
    }
    next();
  };
};

module.exports = { protect, authorize };