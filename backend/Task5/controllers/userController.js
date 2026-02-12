const User = require("../models/User");
const Chat = require("../models/Chat");

const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { search, limit = 100, page = 1 } = req.query;

    const skip = (page - 1) * limit;
    let query = { _id: { $ne: currentUserId } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(query)
      .select("name email profilePicture isOnline lastSeen lastActiveAt")
      .sort({ isOnline: -1, lastSeen: -1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total: total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      users: users.map(user => ({
        ...user.toObject(),
        lastSeenFormatted: user.lastSeenFormatted
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching users",
      error: error.message,
    });
  }
};

const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
    .select("name email profilePicture isOnline lastSeen lastActiveAt")
    .limit(20);

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        ...user.toObject(),
        lastSeenFormatted: user.lastSeenFormatted
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Search Users Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error searching users",
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot get current user",
      });
    }

    const user = await User.findById(userId).select(
      "name email profilePicture isOnline lastSeen lastActiveAt socketIds"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        lastSeenFormatted: user.lastSeenFormatted,
        connectionCount: user.connectionCount
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Get User By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user",
      error: error.message,
    });
  }
};

const getConversationsList = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { limit = 50 } = req.query;

    // Get conversations with last message
    const conversations = await Chat.aggregate([
      {
        $match: {
          $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
          isDeleted: false,
          deleteFor: { $ne: currentUserId }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", currentUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$message" },
          lastMessageTime: { $first: "$createdAt" },
          lastMessageStatus: { $first: "$status" },
          lastMessageId: { $first: "$_id" },
          totalMessages: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", currentUserId] },
                    { $ne: ["$status", "seen"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "chatbotusers",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$userId"] }
              }
            },
            {
              $project: {
                name: 1,
                email: 1,
                profilePicture: 1,
                isOnline: 1,
                lastSeen: 1,
                lastActiveAt: 1,
                socketIds: 1
              }
            }
          ],
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          userId: "$_id",
          name: "$userInfo.name",
          email: "$userInfo.email",
          profilePicture: "$userInfo.profilePicture",
          // FIX: Use socketIds to determine actual online status (not just isOnline flag)
          isOnline: { 
            $and: [
              "$userInfo.isOnline",
              { $gt: [{ $size: "$userInfo.socketIds" }, 0] }
            ]
          },
          lastSeen: "$userInfo.lastSeen",
          lastActiveAt: "$userInfo.lastActiveAt",
          lastMessage: 1,
          lastMessageTime: 1,
          lastMessageStatus: 1,
          lastMessageId: 1,
          unreadCount: 1,
          totalMessages: 1,
          // Add socket connection count for debugging
          connectionCount: { $size: "$userInfo.socketIds" }
        },
      },
      {
        $sort: { 
          // Online users first
          isOnline: -1,
          // Then unread messages
          unreadCount: -1,
          // Then recent conversations
          lastMessageTime: -1
        },
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Get users without conversations
    const allUsers = await User.find({ _id: { $ne: currentUserId } })
      .select("name email profilePicture isOnline lastSeen lastActiveAt socketIds")
      .sort({ 
        isOnline: -1, 
        lastSeen: -1 
      })
      .limit(20)
      .lean();

    const existingUserIds = new Set(conversations.map(c => c.userId.toString()));
    
    const usersWithoutChats = allUsers
      .filter(user => !existingUserIds.has(user._id.toString()))
      .map(user => ({
        userId: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        // FIX: Check both isOnline AND socketIds
        isOnline: user.isOnline && user.socketIds && user.socketIds.length > 0,
        lastSeen: user.lastSeen,
        lastActiveAt: user.lastActiveAt,
        lastMessage: null,
        lastMessageTime: null,
        lastMessageStatus: null,
        unreadCount: 0,
        totalMessages: 0,
        connectionCount: user.socketIds?.length || 0
      }));

    const allConversations = [...conversations, ...usersWithoutChats];

    // Calculate total unread count
    const totalUnread = allConversations.reduce(
      (total, conv) => total + (conv.unreadCount || 0),
      0
    );

    // Store total unread in localStorage for beforeunload warning
    res.on('finish', () => {
      if (totalUnread > 0) {
        // This will be picked up by frontend
        req.app.locals.userUnreadCount = req.app.locals.userUnreadCount || {};
        req.app.locals.userUnreadCount[currentUserId] = totalUnread;
      }
    });

    res.status(200).json({
      success: true,
      count: allConversations.length,
      totalUnread: totalUnread,
      conversations: allConversations.map(conv => ({
        ...conv,
        lastSeenFormatted: formatLastSeen(conv.lastSeen),
        isActive: conv.isOnline || isRecentlyActive(conv.lastActiveAt),
        // Remove connectionCount from final response
        connectionCount: undefined
      })),
      timestamp: Date.now(),
      // Debug info
      debug: {
        onlineUsers: allConversations.filter(c => c.isOnline).length,
        totalUsers: allConversations.length,
        currentUserId: currentUserId
      }
    });
  } catch (error) {
    console.error("Get Conversations List Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching conversations",
      error: error.message,
    });
  }
};

// Helper functions
function formatLastSeen(lastSeen) {
  if (!lastSeen) return "Never";
  
  const now = new Date();
  const diffMs = now - new Date(lastSeen);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return new Date(lastSeen).toLocaleDateString();
}

function isRecentlyActive(lastActiveAt, thresholdMinutes = 5) {
  if (!lastActiveAt) return false;
  const now = new Date();
  const diffMs = now - new Date(lastActiveAt);
  return diffMs < thresholdMinutes * 60000;
}

module.exports = {
  getAllUsers,
  searchUsers,
  getUserById,
  getConversationsList,
};