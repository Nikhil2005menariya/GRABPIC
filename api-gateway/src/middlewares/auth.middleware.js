const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const protect = async (req, res, next) => {
  try {
    let token = null;

    // ---------------------------------------
    // Extract Bearer Token
    // ---------------------------------------
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        message: "Not authorized, token missing",
      });
    }

    // ---------------------------------------
    // Verify JWT
    // ---------------------------------------
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ---------------------------------------
    // Fetch User
    // ---------------------------------------
    const user = await User.findById(decoded.id).select(
      "-password -__v"
    );

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Email not verified",
      });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);

    return res.status(401).json({
      message: "Token invalid or expired",
    });
  }
};

module.exports = protect;
