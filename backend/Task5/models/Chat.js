const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chatbotuser",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chatbotuser",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "voice"],
      default: "text",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // deleteFor: [{
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "chatbotuser",
    // }],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for optimized queries
chatSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
chatSchema.index({ receiverId: 1, status: 1, createdAt: -1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ 
  $or: [
    { senderId: 1, receiverId: 1 },
    { receiverId: 1, senderId: 1 }
  ],
  createdAt: -1 
});

// Virtual for message ID
chatSchema.virtual('messageId').get(function() {
  return this._id.toString();
});

// Method to check if message is visible to user
chatSchema.methods.isVisibleTo = function(userId) {
  return !this.isDeleted || !this.deleteFor.includes(userId);
};

module.exports = mongoose.models.Chat || mongoose.model("Chat", chatSchema);