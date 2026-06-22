const ErrorResponse = require("../utils/errorResponse");

/**
 * Centralized error handler. Place this AFTER all routes in server.js.
 * Converts known error types (Mongoose, JWT, custom) into clean JSON responses,
 * so controllers can just `throw` and not worry about res.json formatting.
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Mongoose: invalid ObjectId (e.g. /api/users/123notanid)
  if (err.name === "CastError") {
    error = new ErrorResponse(`Resource not found with id of ${err.value}`, 404);
  }

  // Mongoose: duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ErrorResponse(`An account with this ${field} already exists`, 400);
  }

  // Mongoose: schema validation failed
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new ErrorResponse(message, 400);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Server Error";

  if (process.env.NODE_ENV === "development" && statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

/**
 * Catches requests to routes that don't exist (404).
 * Place this AFTER all real routes but BEFORE errorHandler.
 */
const notFound = (req, res, next) => {
  const error = new ErrorResponse(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

module.exports = { errorHandler, notFound };