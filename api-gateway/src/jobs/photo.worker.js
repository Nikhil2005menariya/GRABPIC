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
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null, // required for BullMQ
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
      // Call AI service
      await axios.post(`${process.env.AI_SERVICE_URL}/process-photo`, {
        photoId,
        s3Key,
        eventId,
      });

      // Mark photo as processed
      await Photo.findByIdAndUpdate(photoId, {
        processed: true,
      });

      // Increment processed count
      const event = await Event.findByIdAndUpdate(
        eventId,
        { $inc: { processedPhotos: 1 } },
        { new: true }
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

// --------------------------------------
// Worker Events
// --------------------------------------
worker.on("completed", (job) => {
  console.log(`🎉 Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`💥 Job failed: ${job?.id}`, err.message);
});

console.log("🚀 Photo Worker Started");
