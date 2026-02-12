const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = require("../config/s3");
const Photo = require("../models/photo.model");
const Event = require("../models/event.model");
const { photoQueue } = require("../jobs/photo.queue");

// --------------------------------------
// Generate Presigned Upload URL
// --------------------------------------
const generateUploadUrl = async (req, res) => {
  try {
    const { eventId, fileName, fileType } = req.body;

    if (!eventId || !fileName || !fileType) {
      return res.status(400).json({
        message: "eventId, fileName and fileType are required",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Ensure only owner can upload
    if (event.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const s3Key = `events/${eventId}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: s3Key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300, // 5 min
    });

    const photo = await Photo.create({
      event: eventId,
      s3Key,
    });

    // Increase total photo count
    await Event.findByIdAndUpdate(eventId, {
      $inc: { totalPhotos: 1 },
    });

    return res.status(200).json({
      uploadUrl,
      photoId: photo._id,
      s3Key,
    });

  } catch (error) {
    console.error("Generate upload URL error:", error);
    return res.status(500).json({
      message: "Failed to generate upload URL",
    });
  }
};

// --------------------------------------
// Confirm Upload & Push to Queue
// --------------------------------------
const confirmUpload = async (req, res) => {
  try {
    const { photoId } = req.body;

    if (!photoId) {
      return res.status(400).json({
        message: "Photo ID is required",
      });
    }

    const photo = await Photo.findById(photoId);

    if (!photo) {
      return res.status(404).json({
        message: "Photo not found",
      });
    }

    // Push job to Redis queue
    await photoQueue.add("process-photo", {
      photoId: photo._id,
      s3Key: photo.s3Key,
      eventId: photo.event,
    });

    return res.status(200).json({
      message: "Upload confirmed. Processing started.",
    });

  } catch (error) {
    console.error("Confirm upload error:", error);
    return res.status(500).json({
      message: "Confirmation failed",
    });
  }
};

// --------------------------------------
// Export Properly (IMPORTANT)
// --------------------------------------
module.exports = {
  generateUploadUrl,
  confirmUpload,
};
