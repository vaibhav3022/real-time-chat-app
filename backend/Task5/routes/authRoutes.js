const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  logout,
  getMe,
  googleLogin,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware"); // ✅ FIXED

router.post("/signup", signup);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

module.exports = router;
