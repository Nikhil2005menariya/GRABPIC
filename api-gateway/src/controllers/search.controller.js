const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const Event = require("../models/event.model");
const Photo = require("../models/photo.model");

const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3");

// Multer memory storage (selfie will not be saved to disk)
const upload = multer({ storage: multer.memoryStorage() });

exports.uploadMiddleware = upload.single("file");

exports.searchPhotos = async (req, res) => {
  try {
    const { eventCode } = req.body;

    if (!eventCode || !req.file) {
      return res.status(400).json({
        message: "Event code and selfie file are required",
      });
    }

    // Find event by eventCode
    const event = await Event.findOne({ eventCode });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
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

    const matches = aiResponse.data.matches;

    if (!matches || matches.length === 0) {
      return res.json({
        total: 0,
        photos: [],
      });
    }

    // Fetch matching photos
    const photos = await Photo.find({
      _id: { $in: matches },
    });

    // Generate signed URLs
    const signedPhotos = await Promise.all(
      photos.map(async (photo) => {
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: photo.s3Key,
        });

        const url = await getSignedUrl(s3, command, {
          expiresIn: 300, // 5 minutes
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
    console.error("Search error:", error.response?.data || error.message);

    return res.status(500).json({
      message: "Search failed",
    });
  }
};
