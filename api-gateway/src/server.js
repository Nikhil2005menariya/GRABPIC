require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
require("./config/redis");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const photoRoutes = require("./routes/photo.routes");
const searchRoutes = require("./routes/search.routes");

const app = express();

// ------------------------
// Connect Database
// ------------------------
connectDB();

// ------------------------
// Global Middlewares
// ------------------------
app.use(express.json());

// ------------------------
// CORS Configuration
// ------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

// ------------------------
// Rate Limiting
// ------------------------
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    message: "Too many search requests. Please try again later.",
  },
});

// ------------------------
// Routes
// ------------------------
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/search", searchLimiter, searchRoutes);

// ------------------------
// Default Route
// ------------------------
app.get("/", (req, res) => {
  res.send("🚀 GRABPIC API Running");
});

// ------------------------
// Global Error Handler
// ------------------------
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.message);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// ------------------------
// 404 Handler
// ------------------------
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ------------------------
// Start Server
// ------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
