// const mongoose = require("mongoose");

// const connectDB = async () => {
//   try {
//     // 🟢 Already connected → do nothing
//     if (mongoose.connection.readyState === 1) {
//       console.log("🟢 MongoDB already connected");
//       return;
//     }

//     await mongoose.connect(process.env.MONGO_URI);

//     console.log("✅ MongoDB Connected Successfully");
//     console.log(`📊 Database: ${mongoose.connection.name}`);
//   } catch (error) {
//     console.error("❌ MongoDB Connection Error:", error.message);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;
