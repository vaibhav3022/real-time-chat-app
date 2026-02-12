const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,
  updateMessageStatus,
  markMessagesAsSeen,
  deleteMessage,
  getUnreadCount,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

router.post("/send", protect, sendMessage);
router.get("/unread/count", protect, getUnreadCount);
router.get("/:userId", protect, getMessages);
router.put("/:messageId/status", protect, updateMessageStatus);
router.put("/mark-seen/:userId", protect, markMessagesAsSeen);
router.delete("/:messageId", protect, deleteMessage);

const upload = require("../middleware/uploadMiddleware");

// Upload file
router.post("/upload", protect, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  // Return file path
  const fileUrl = `/uploads/${req.file.filename}`;

  res.status(200).json({
    success: true,
    fileUrl: fileUrl,
    fileName: req.file.originalname,
    fileType: req.file.mimetype
  });
});

module.exports = router;