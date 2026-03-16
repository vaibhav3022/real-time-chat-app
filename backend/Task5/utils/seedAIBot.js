const mongoose = require("mongoose");
const User = require("../models/User");

const seedAIBot = async () => {
  try {
    const aiEmail = "bot@meta.ai";
    const existingBot = await User.findOne({ email: aiEmail });

    if (!existingBot) {
      console.log("🤖 Aura AI Bot not found. Creating...");
      const aiBot = new User({
        name: "Aura AI ✨",
        email: aiEmail,
        password: "secure_random_ai_password_123!@#", // We won't ever login with this manually
        profilePicture: "https://robohash.org/AuraAI?set=set3&bgset=bg1&size=200x200",
        isOnline: true,
      });

      await aiBot.save();
      console.log("✅ Meta AI Bot seeded successfully!");
    } else {
      // Ensure AI bot is always marked online on server start
      existingBot.isOnline = true;
      existingBot.lastSeen = new Date();
      existingBot.profilePicture = "https://robohash.org/AuraAI?set=set3&bgset=bg1&size=200x200";
      
      if (!existingBot.name.includes("Aura AI")) {
        existingBot.name = "Aura AI ✨";
      }

      await existingBot.save();
      console.log("🤖 Aura AI Bot ready.");
    }
  } catch (error) {
    console.error("❌ Error seeding Meta AI Bot:", error.message);
  }
};

module.exports = seedAIBot;
