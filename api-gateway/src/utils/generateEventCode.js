const crypto = require("crypto");

const generateEventCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

module.exports = generateEventCode;
