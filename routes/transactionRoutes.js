const express = require("express");
const router = express.Router();

const {
  createTransaction,
  getTransactions,
  getSummary,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");
const { protect } = require("../middleware/authMiddleware");

// All transaction routes require a logged-in user
router.use(protect);

router.route("/").post(createTransaction).get(getTransactions);
router.get("/summary", getSummary);
router.route("/:id").put(updateTransaction).delete(deleteTransaction);

module.exports = router;