const asyncHandler = require("express-async-handler");
const Transaction = require("../models/Transaction");
const ErrorResponse = require("../utils/errorResponse");

/**
 * @desc    Create a new transaction (income/expense/saving)
 * @route   POST /api/transactions
 * @access  Private
 */
const createTransaction = asyncHandler(async (req, res) => {
  const { type, category, amount, note, source, date } = req.body;

  if (!type || amount === undefined) {
    throw new ErrorResponse("Type and amount are required", 400);
  }

  const transaction = await Transaction.create({
    user: req.user._id,
    type,
    category,
    amount,
    note,
    source,
    date,
  });

  res.status(201).json({
    success: true,
    message: "Transaction recorded",
    data: transaction,
  });
});

/**
 * @desc    Get all transactions for the logged-in user (optionally filtered)
 * @route   GET /api/transactions?type=income&from=2026-01-01&to=2026-06-01
 * @access  Private
 */
const getTransactions = asyncHandler(async (req, res) => {
  const { type, from, to } = req.query;

  const filter = { user: req.user._id };
  if (type) filter.type = type;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const transactions = await Transaction.find(filter).sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  });
});

/**
 * @desc    Get a quick summary (total income, expense, savings, net) for the logged-in user
 * @route   GET /api/transactions/summary
 * @access  Private
 */
const getSummary = asyncHandler(async (req, res) => {
  const results = await Transaction.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);

  const summary = { income: 0, expense: 0, saving: 0 };
  results.forEach((r) => {
    summary[r._id] = r.total;
  });
  summary.net = summary.income - summary.expense;

  res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * @desc    Update a transaction
 * @route   PUT /api/transactions/:id
 * @access  Private
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    throw new ErrorResponse("Transaction not found", 404);
  }
  if (transaction.user.toString() !== req.user._id.toString()) {
    throw new ErrorResponse("Not authorized to modify this transaction", 403);
  }

  const allowedFields = ["type", "category", "amount", "note", "date"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) transaction[field] = req.body[field];
  });

  await transaction.save();

  res.status(200).json({
    success: true,
    message: "Transaction updated",
    data: transaction,
  });
});

/**
 * @desc    Delete a transaction
 * @route   DELETE /api/transactions/:id
 * @access  Private
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    throw new ErrorResponse("Transaction not found", 404);
  }
  if (transaction.user.toString() !== req.user._id.toString()) {
    throw new ErrorResponse("Not authorized to delete this transaction", 403);
  }

  await transaction.deleteOne();

  res.status(200).json({
    success: true,
    message: "Transaction deleted",
  });
});

module.exports = {
  createTransaction,
  getTransactions,
  getSummary,
  updateTransaction,
  deleteTransaction,
};