const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  searchUsers,
  getUserById,
  getConversationsList,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware"); // ✅ FIXED

router.get("/", protect, getAllUsers);
router.get("/search", protect, searchUsers);
router.get("/conversations/list", protect, getConversationsList);
router.get("/:userId", protect, getUserById);

module.exports = router;
