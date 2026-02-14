const express = require("express");
const router = express.Router();

const {
  sendOTP,
  verifyOTP,
  setPassword,
  login,
} = require("../controllers/auth.controller");


// -----------------------------
// Signup Flow
// -----------------------------
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/set-password", setPassword);


// -----------------------------
// Login
// -----------------------------
router.post("/login", login);


module.exports = router;
