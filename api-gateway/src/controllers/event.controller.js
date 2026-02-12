const Event = require("../models/event.model");
const generateEventCode = require("../utils/generateEventCode");

// Create Event
exports.createEvent = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Event name is required" });
    }

    let eventCode;
    let existing;

    // Ensure unique event code
    do {
      eventCode = generateEventCode();
      existing = await Event.findOne({ eventCode });
    } while (existing);

    const event = await Event.create({
      name,
      owner: req.user._id,
      eventCode,
    });

    res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Event creation failed" });
  }
};

// Get My Events
exports.getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

exports.getEventStatus = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({
      status: event.status,
      totalPhotos: event.totalPhotos,
      processedPhotos: event.processedPhotos,
      progress:
        event.totalPhotos === 0
          ? 0
          : Math.round(
              (event.processedPhotos / event.totalPhotos) * 100
            ),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get status" });
  }
};
