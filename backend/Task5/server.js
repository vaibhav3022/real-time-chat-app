// const http = require("http");
// const app = require("./app");
// const { initializeSocket } = require("./socket/socketHandler");

// const PORT = process.env.PORT || 5005;

// // Create HTTP server
// const server = http.createServer(app);

// // Initialize Socket.IO
// initializeSocket(server);

// // Start server
// server.listen(PORT, () => {
//   console.log("╔════════════════════════════════════════╗");
//   console.log("║   🚀 Task5 ChatBot Server Running    ║");
//   console.log("╠════════════════════════════════════════╣");
//   console.log(`║   📍 Port: ${PORT}                       ║`);
//   console.log(`║   🌐 URL: http://localhost:${PORT}      ║`);
//   console.log("║   💬 Socket.IO: Enabled               ║");
//   console.log("║   📊 Database: Connected              ║");
//   console.log("╚════════════════════════════════════════╝");
// });