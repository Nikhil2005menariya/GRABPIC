const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");

const {
  createEvent,
  joinEvent,
  getMyCreatedEvents,
  getMyJoinedEvents,
  getEventStatus,
  getMyEvents,
  deleteEvent,
} = require("../controllers/event.controller");

//
// ----------------------------------------
// CREATE EVENT
// ----------------------------------------
router.post("/", protect, createEvent);

//
// ----------------------------------------
// JOIN EVENT (via event code)
// ----------------------------------------
router.post("/join", protect, joinEvent);

//
// ----------------------------------------
// GET EVENTS CREATED BY USER
// ----------------------------------------
router.get("/created", protect, getMyCreatedEvents);

//
// ----------------------------------------
// GET EVENTS USER HAS JOINED
// ----------------------------------------
router.get("/joined", protect, getMyJoinedEvents);

//
// ----------------------------------------
// GET EVENT STATUS
// ----------------------------------------
router.get("/:eventId/status", protect, getEventStatus);

router.get("/my-events", protect, getMyEvents);
router.delete("/:eventId", protect, deleteEvent);

module.exports = router;
