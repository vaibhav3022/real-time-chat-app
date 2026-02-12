const Chat = require("../models/Chat");
const User = require("../models/User");

const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, messageType = "text" } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !message) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID and message are required",
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    const newMessage = await Chat.create({
      senderId,
      receiverId,
      message,
      messageType,
      status: "sent",
    });

    const populatedMessage = await Chat.findById(newMessage._id)
      .populate("senderId", "name email profilePicture")
      .populate("receiverId", "name email profilePicture");

    // Update sender's lastSeen
    await User.findByIdAndUpdate(senderId, {
      lastSeen: new Date(),
      lastActiveAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      chat: populatedMessage,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error sending message",
      error: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const { page = 1, limit = 100 } = req.query;

    const skip = (page - 1) * limit;

    const messages = await Chat.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId },
      ],
      isDeleted: false,
      deleteFor: { $ne: currentUserId }
    })
      .populate("senderId", "name email profilePicture")
      .populate("receiverId", "name email profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalMessages = await Chat.countDocuments({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId },
      ],
      isDeleted: false,
      deleteFor: { $ne: currentUserId }
    });

    // Reverse to get oldest first for display
    const sortedMessages = messages.reverse();

    res.status(200).json({
      success: true,
      count: messages.length,
      total: totalMessages,
      page: parseInt(page),
      pages: Math.ceil(totalMessages / limit),
      messages: sortedMessages,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching messages",
      error: error.message,
    });
  }
};

const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    if (!["delivered", "seen"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'delivered' or 'seen'",
      });
    }

    const message = await Chat.findByIdAndUpdate(
      messageId,
      { status },
      { new: true }
    )
      .populate("senderId", "name email profilePicture")
      .populate("receiverId", "name email profilePicture");

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Message status updated",
      chat: message,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Update Message Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating message status",
      error: error.message,
    });
  }
};

const markMessagesAsSeen = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const result = await Chat.updateMany(
      {
        senderId: userId,
        receiverId: currentUserId,
        status: { $ne: "seen" },
      },
      { status: "seen" }
    );

    // Update user's lastSeen
    await User.findByIdAndUpdate(currentUserId, {
      lastSeen: new Date(),
      lastActiveAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: "Messages marked as seen",
      modifiedCount: result.modifiedCount,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Mark Messages As Seen Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error marking messages as seen",
      error: error.message,
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user._id;
    const { deleteForEveryone } = req.body;

    const message = await Chat.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (deleteForEveryone) {
      // Soft delete for everyone
      message.isDeleted = true;
      message.deleteFor = [message.senderId, message.receiverId];
      await message.save();

      // 🔥 Real-time update for everyone
      if (req.io) {
        req.io.to(`user:${message.senderId}`).emit("message:deleted", {
          messageId: message._id,
          deleteForEveryone: true
        });
        req.io.to(`user:${message.receiverId}`).emit("message:deleted", {
          messageId: message._id,
          deleteForEveryone: true
        });
      }
    } else {
      // Delete only for current user
      if (!message.deleteFor.includes(currentUserId)) {
        message.deleteFor.push(currentUserId);
        await message.save();
      }
    }

    res.status(200).json({
      success: true,
      message: deleteForEveryone
        ? "Message deleted for everyone"
        : "Message deleted for you",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Delete Message Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting message",
      error: error.message,
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const count = await Chat.countDocuments({
      receiverId: currentUserId,
      status: { $ne: "seen" },
      isDeleted: false,
      deleteFor: { $ne: currentUserId }
    });

    // Also get unread counts per user
    const unreadByUser = await Chat.aggregate([
      {
        $match: {
          receiverId: currentUserId,
          status: { $ne: "seen" },
          isDeleted: false,
          deleteFor: { $ne: currentUserId }
        }
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      unreadCount: count,
      unreadByUser: unreadByUser,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Get Unread Count Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching unread count",
      error: error.message,
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  updateMessageStatus,
  markMessagesAsSeen,
  deleteMessage,
  getUnreadCount,
};