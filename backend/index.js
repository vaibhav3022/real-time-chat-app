const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");

dotenv.config();

const connectDB = require("./config/db");
const { initializeSocket } = require("./socket");

// Task apps

const task5App = require("./Task5/app");



// Socket handlers

const task5Socket = require("./Task5/socket/socketHandler");

const app = express();
const server = http.createServer(app);

// DB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "https://real-time-chat-app123.vercel.app"
  ],
  credentials: true,
}));
app.use(express.json());

// Routes

// 🔥 ONE SOCKET INSTANCE
const io = initializeSocket(server);

// 🔥 Attach socket handlers
task5Socket(io);

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/task5", task5App);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Main server running",
    tasks: {
      task5: "/task5",

    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 Main Server Running               ║
║   💬 Task5: WhatsApp Chat              ║

`);
});