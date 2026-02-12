const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const {
  createEvent,
  getMyEvents,
  getEventStatus
} = require("../controllers/event.controller");

router.post("/", protect, createEvent);
router.get("/my-events", protect, getMyEvents);
router.get("/:eventId/status", protect, getEventStatus);


module.exports = router;
