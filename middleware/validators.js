const { body, validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");

/**
 * Runs after the express-validator chains below and throws a clean 400
 * error if any validation failed, instead of letting bad data hit the DB.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(", ");
    throw new ErrorResponse(message, 400);
  }
  next();
};

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("phone")
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Phone must be a valid 10-digit Indian mobile number"),
  handleValidationErrors,
];

const loginValidation = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

const updateProfileValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("preferredLanguage").optional().isString(),
  body("incomeType").optional().isString(),
  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  handleValidationErrors,
};