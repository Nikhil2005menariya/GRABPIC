require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
require("./config/redis"); // ensure redis initializes

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

// CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// ------------------------
// Rate Limiting
// ------------------------
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 search requests per window
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

// Default Route
app.get("/", (req, res) => {
  res.send("🚀 GRABPIC API Running");
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
