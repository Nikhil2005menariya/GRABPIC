const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const {
  uploadMiddleware,
  searchPhotos,
} = require("../controllers/search.controller");

router.post("/", uploadMiddleware, searchPhotos);


module.exports = router;
