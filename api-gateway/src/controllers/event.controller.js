const Event = require("../models/event.model");
const User = require("../models/user.model");
const Photo = require("../models/photo.model");
const axios = require("axios");
const generateEventCode = require("../utils/generateEventCode");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");

//
// ----------------------------------------
// CREATE EVENT
// ----------------------------------------
//
exports.createEvent = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Event name is required" });
    }

    let eventCode;
    let existing;

    // 🔥 Ensure unique event code
    do {
      eventCode = generateEventCode();
      existing = await Event.findOne({ eventCode });
    } while (existing);

    const event = await Event.create({
      name,
      owner: req.user._id,
      eventCode,
    });

    // 🔥 Add to user's createdEvents
    await User.findByIdAndUpdate(req.user._id, {
      $push: { createdEvents: event._id },
    });

    res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({ message: "Event creation failed" });
  }
};

// ----------------------------------------
// JOIN EVENT (Participate via Code)
// ----------------------------------------
exports.joinEvent = async (req, res) => {
  try {
    const { eventCode } = req.body;

    if (!eventCode) {
      return res.status(400).json({ message: "Event code is required" });
    }

    const event = await Event.findOne({ eventCode });

    if (!event) {
      return res.status(404).json({ message: "Invalid event code" });
    }

    const userId = req.user._id;

    // 🔥 Prevent duplicate join (check Event side)
    if (event.participants.includes(userId)) {
      return res.status(400).json({
        message: "Already joined this event",
      });
    }

    // ✅ Add user to event participants
    event.participants.push(userId);
    await event.save();

    // ✅ Add event to user's joinedEvents
    await User.findByIdAndUpdate(userId, {
      $addToSet: { joinedEvents: event._id }, // safer than $push
    });

    res.status(200).json({
      message: "Joined event successfully",
      event,
    });

  } catch (error) {
    console.error("Join event error:", error);
    res.status(500).json({ message: "Failed to join event" });
  }
};


//
// ----------------------------------------
// GET MY CREATED EVENTS
// ----------------------------------------
//
exports.getMyCreatedEvents = async (req, res) => {
  try {
    const events = await Event.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json(events);
  } catch (error) {
    console.error("Get created events error:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

//
// ----------------------------------------
// GET MY JOINED EVENTS
// ----------------------------------------
//
exports.getMyJoinedEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "joinedEvents",
      options: { sort: { createdAt: -1 } },
    });

    res.status(200).json(user.joinedEvents);
  } catch (error) {
    console.error("Get joined events error:", error);
    res.status(500).json({ message: "Failed to fetch joined events" });
  }
};

//
// ----------------------------------------
// GET EVENT STATUS (Processing Progress)
// ----------------------------------------
//
exports.getEventStatus = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const progress =
      event.totalPhotos === 0
        ? 0
        : Math.round((event.processedPhotos / event.totalPhotos) * 100);

    res.status(200).json({
      status: event.status,
      totalPhotos: event.totalPhotos,
      processedPhotos: event.processedPhotos,
      progress,
    });
  } catch (error) {
    console.error("Get event status error:", error);
    res.status(500).json({ message: "Failed to get status" });
  }
};


exports.getMyEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: "createdEvents",
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: "joinedEvents",
        options: { sort: { createdAt: -1 } },
      });

    res.status(200).json({
      created: user.createdEvents,
      joined: user.joinedEvents,
    });

  } catch (error) {
    console.error("Get my events error:", error);
    res.status(500).json({
      message: "Failed to fetch events",
    });
  }
};

//
exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only event owner can delete this event",
      });
    }

    // --------------------------------------
    // 1️⃣ Delete embeddings from AI service
    // --------------------------------------
    try {
      await axios.delete(
        `${process.env.AI_SERVICE_URL}/delete-event/${eventId}`
      );
      console.log("✅ Chroma embeddings deleted");
    } catch (err) {
      console.error("Chroma delete error:", err.message);
    }

    // --------------------------------------
    // 2️⃣ Get all photos
    // --------------------------------------
    const photos = await Photo.find({ event: event._id });

    // --------------------------------------
    // 3️⃣ Delete S3 objects
    // --------------------------------------
    for (const photo of photos) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: photo.s3Key,
        });

        await s3.send(command);
      } catch (err) {
        console.error("S3 delete error:", err.message);
      }
    }

    // --------------------------------------
    // 4️⃣ Delete photo documents
    // --------------------------------------
    await Photo.deleteMany({ event: event._id });

    // --------------------------------------
    // 5️⃣ Remove event from users
    // --------------------------------------
    await User.findByIdAndUpdate(event.owner, {
      $pull: { createdEvents: event._id },
    });

    await User.updateMany(
      { joinedEvents: event._id },
      { $pull: { joinedEvents: event._id } }
    );

    // --------------------------------------
    // 6️⃣ Delete event document
    // --------------------------------------
    await event.deleteOne();

    res.status(200).json({
      message: "Event and all related data deleted successfully",
    });

  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({
      message: "Failed to delete event",
    });
  }
};

