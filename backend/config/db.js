const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // 🟢 Already connected → do nothing
    if (mongoose.connection.readyState === 1) {
      console.log("🟢 MongoDB already connected");
      return;
    }

    if (!process.env.MONGO_URI || !process.env.MONGO_URI.includes(process.env.MONGO_URI.split('/').pop())) {
      console.warn("⚠️ Warning: MONGO_URI might be missing a database name!");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: \x1b[1m${conn.connection.name}\x1b[0m`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
