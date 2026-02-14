const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    eventCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["processing", "ready"],
      default: "processing",
    },

    totalPhotos: {
      type: Number,
      default: 0,
    },

    processedPhotos: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
