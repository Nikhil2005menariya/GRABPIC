const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const sendOTPEmail = require("../services/email.service");
const {
  generateOTP,
  storeOTP,
  verifyOTP,
} = require("../services/otp.service");


// =======================================
// 1️⃣ Send OTP
// =======================================
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const otp = generateOTP();

    await storeOTP(email, otp);
    await sendOTPEmail(email, otp);

    res.status(200).json({
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({
      message: "Failed to send OTP",
    });
  }
};


// =======================================
// 2️⃣ Verify OTP
// =======================================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP required",
      });
    }

    const isValid = await verifyOTP(email, otp);

    if (!isValid) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    res.status(200).json({
      message: "OTP verified successfully. Please set password.",
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({
      message: "OTP verification failed",
    });
  }
};


// =======================================
// 3️⃣ Set Password (Create User)
// =======================================
exports.setPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists. Please login.",
      });
    }

    const user = await User.create({
      email,
      password, // 🔥 Will be hashed automatically
      isVerified: true,
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "Signup successful",
      token,
      user,
    });

  } catch (error) {
    console.error("Set Password Error:", error);
    res.status(500).json({
      message: "Failed to set password",
    });
  }
};


// =======================================
// 4️⃣ Login
// =======================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
      user,
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: "Login failed",
    });
  }
};
