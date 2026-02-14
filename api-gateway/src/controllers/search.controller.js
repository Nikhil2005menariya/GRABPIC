const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const Event = require("../models/event.model");
const Photo = require("../models/photo.model");
const User = require("../models/user.model");

const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3");

// ------------------------------
// Multer (memory storage)
// ------------------------------
const upload = multer({ storage: multer.memoryStorage() });
exports.uploadMiddleware = upload.single("file");

// ------------------------------
// Search Photos (Protected)
// ------------------------------
exports.searchPhotos = async (req, res) => {
  try {
    const { eventCode } = req.body;

    if (!eventCode || !req.file) {
      return res.status(400).json({
        message: "Event code and selfie file are required",
      });
    }

    // 🔍 Find event
    const event = await Event.findOne({ eventCode });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    // 🔐 Check if user is owner or joined
    const user = await User.findById(req.user._id);

    const isOwner =
      event.owner.toString() === req.user._id.toString();

    const isJoined = user.joinedEvents.some(
      (e) => e.toString() === event._id.toString()
    );

    if (!isOwner && !isJoined) {
      return res.status(403).json({
        message: "You are not a participant of this event",
      });
    }

    // -------------------------
    // Send selfie to AI service
    // -------------------------
    const formData = new FormData();

    formData.append("eventId", event._id.toString());
    formData.append("file", req.file.buffer, {
      filename: "selfie.jpg",
      contentType: req.file.mimetype,
    });

    const aiResponse = await axios.post(
      `${process.env.AI_SERVICE_URL}/search-face`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const matches = aiResponse.data.matches || [];

    if (matches.length === 0) {
      return res.json({
        total: 0,
        photos: [],
      });
    }

    // -------------------------
    // Fetch matching photos (extra safety filter by event)
    // -------------------------
    const photos = await Photo.find({
      _id: { $in: matches },
      event: event._id, // 🔥 critical safety
    });

    // -------------------------
    // Generate signed URLs
    // -------------------------
    const signedPhotos = await Promise.all(
      photos.map(async (photo) => {
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: photo.s3Key,
        });

        const url = await getSignedUrl(s3, command, {
          expiresIn: 60 * 5,
        });

        return {
          photoId: photo._id,
          url,
        };
      })
    );

    return res.json({
      total: signedPhotos.length,
      photos: signedPhotos,
    });

  } catch (error) {
    console.error(
      "Search error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Search failed",
    });
  }
};
