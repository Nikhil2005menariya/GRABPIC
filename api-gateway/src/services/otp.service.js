const redis = require("../config/redis");

const OTP_EXPIRY = 300; // 5 minutes

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOTP = async (email, otp) => {
  await redis.set(`otp:${email}`, otp, "EX", OTP_EXPIRY);
};

const verifyOTP = async (email, otp) => {
  const storedOtp = await redis.get(`otp:${email}`);

  if (!storedOtp) return false;

  return storedOtp === otp;
};

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
};
