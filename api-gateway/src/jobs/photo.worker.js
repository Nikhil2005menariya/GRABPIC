require("dotenv").config();

const mongoose = require("mongoose");
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const axios = require("axios");

const Photo = require("../models/photo.model");
const Event = require("../models/event.model");

// --------------------------------------
// Connect MongoDB (Worker runs separately)
// --------------------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Worker MongoDB Connected"))
  .catch((err) => {
    console.error("❌ Worker MongoDB Error:", err);
    process.exit(1);
  });

// --------------------------------------
// Redis Connection
// --------------------------------------
const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});


// --------------------------------------
// Worker Definition
// --------------------------------------
const worker = new Worker(
  "photo-processing",
  async (job) => {
    const { photoId, s3Key, eventId } = job.data;

    console.log("📸 Processing photo:", photoId);

    try {
      // 🔥 Defensive validation
      if (!photoId || !s3Key || !eventId) {
        throw new Error("Missing required job data");
      }

      // 🔥 Force everything to string (CRITICAL FIX)
      const payload = {
        photoId: String(photoId),
        s3Key: String(s3Key),
        eventId: String(eventId),
      };

      console.log("➡ Sending to AI:", payload);

      // Call AI service
      await axios.post(
        `${process.env.AI_SERVICE_URL}/process-photo`,
        payload
      );

      // Mark photo as processed
      await Photo.findByIdAndUpdate(photoId, {
        processed: true,
      });

      // 🔥 FIX MONGOOSE DEPRECATION WARNING
      const event = await Event.findByIdAndUpdate(
        eventId,
        { $inc: { processedPhotos: 1 } },
        { returnDocument: "after" } // instead of { new: true }
      );

      // If all processed → mark event ready
      if (event && event.processedPhotos >= event.totalPhotos) {
        event.status = "ready";
        await event.save();
        console.log("✅ Event ready:", eventId);
      }

      console.log("✅ Photo processed:", photoId);

    } catch (error) {
      console.error(
        "❌ Processing failed:",
        error.response?.data || error.message
      );
      throw error; // allow BullMQ retry
    }
  },
  { connection }
);


console.log("🚀 Photo Worker Started");
