const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    socketIds: [
      {
        type: String,
      },
    ],
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);


// ✅ FIXED PASSWORD HASH HOOK (NO next())
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


// ✅ FIXED findOneAndUpdate hook
userSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();

  if (update && update.isOnline === true) {
    this.set({ lastActiveAt: new Date() });
  }
});


// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};


// Virtuals
userSchema.virtual("connectionCount").get(function () {
  return this.socketIds?.length || 0;
});

userSchema.virtual("lastSeenFormatted").get(function () {
  if (!this.lastSeen) return "Never";

  const now = new Date();
  const diffMs = now - this.lastSeen;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return this.lastSeen.toLocaleDateString();
});

module.exports =
  mongoose.models.chatbotuser ||
  mongoose.model("chatbotuser", userSchema);
