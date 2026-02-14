const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const {
  uploadMiddleware,
  searchPhotos,
  downloadAllPhotos,
} = require("../controllers/search.controller");

router.post(
  "/",
  protect,
  uploadMiddleware,
  searchPhotos
);

router.post(
  "/download-all",
  protect,
  downloadAllPhotos
);
module.exports = router;
