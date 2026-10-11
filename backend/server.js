
require("dotenv").config({
  path: require("node:path").join(__dirname, ".env"),
});

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { seedIfEmpty } = require("./services/seeder");

const adRoutes = require("./routes/adRoutes");
const statsRoutes = require("./routes/statsRoutes");
const investigationRoutes = require("./routes/investigationRoutes");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

console.log(
  "Allowed hosts loaded:",
  process.env.ALLOWED_SOURCE_HOSTS || "(not configured)"
);

app.set("io", io);

// Middleware: must run before API routes
app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "FinShield AI API is running",
  });
});

// API routes
app.use("/api/ads", adRoutes);
app.use("/api/investigations", investigationRoutes);
app.use("/api", statsRoutes);

// Not-found handler
app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central error handler
app.use((err, _req, res, _next) => {
  console.error("API Error:", err);

  const statusCode = Number(err.status || err.statusCode) || 500;

  res.status(statusCode).json({
    message:
      statusCode >= 500
        ? "Internal server error. Check the backend terminal."
        : err.message || "Request failed",
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Dashboard disconnected:", socket.id);
  });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    console.log("MongoDB connected successfully");

    await seedIfEmpty();
    console.log("Seed process completed");

    server.listen(PORT, () => {
      console.log(`FinShield AI API running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Failed to start FinShield AI:", error);
    process.exit(1);
  }
}

startServer();
