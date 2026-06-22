/**
 * Custom error class so we can throw errors with an HTTP status code attached,
 * and have the central error handler middleware respond consistently.
 *
 * Usage: throw new ErrorResponse("User not found", 404);
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse;