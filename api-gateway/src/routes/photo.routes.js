const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const { generateUploadUrl, confirmUpload } = require("../controllers/photo.controller");

router.post("/upload-url", protect, generateUploadUrl);
router.post("/confirm-upload", protect, confirmUpload);

module.exports = router;
