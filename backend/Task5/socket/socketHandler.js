const Chat = require("../models/Chat");
const User = require("../models/User");
const { GoogleGenAI } = require("@google/genai");

// Store user connections: userId -> Set of socketIds
const userConnections = new Map();

// Initialize Gemini API (if key is missing, it will throw when used, which is fine since we check it)
let aiClient = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // User joins with userId
    socket.on("user:join", async (userId) => {
      try {
        console.log(`👤 User joining: ${userId}`);
        socket.userId = userId;

        // Join user's personal room
        socket.join(`user:${userId}`);

        // Add to connections map
        if (!userConnections.has(userId)) {
          userConnections.set(userId, new Set());
        }
        userConnections.get(userId).add(socket.id);

        // Always upate user status in DB to ensure fresh timestamp
        const user = await User.findById(userId);
        if (user) {
          // const shouldUpdateStatus = !user.isOnline; // OLD LOGIC
          user.isOnline = true;
          user.lastSeen = new Date();
          user.socketIds = Array.from(userConnections.get(userId));
          await user.save();

          // Broadcast to ALL connected clients that user is online
          io.emit("user:status:update", {
            userId: userId,
            isOnline: true,
            lastSeen: user.lastSeen,
            connections: userConnections.get(userId).size
          });
        }

        // Send current online users to this socket
        const onlineUsers = Array.from(userConnections.keys())
          .filter(id => userConnections.get(id).size > 0);

        socket.emit("users:online:list", { onlineUsers });

        console.log(`User ${userId} joined, connections: ${userConnections.get(userId).size}`);
      } catch (error) {
        console.error("Join error:", error);
      }
    });

    // Send message
    socket.on("message:send", async (data) => {
      try {
        const { senderId, receiverId, message, messageType } = data;

        // Check if receiver is Meta AI Bot
        const receiver = await User.findById(receiverId);
        const isAIBot = receiver && receiver.email === "bot@meta.ai";

        // Create message in DB
        const newMessage = await Chat.create({
          senderId,
          receiverId,
          message,
          messageType,
          status: "sent",
        });

        // Populate sender/receiver info
        const populatedMessage = await Chat.findById(newMessage._id)
          .populate("senderId", "name email")
          .populate("receiverId", "name email");

        const messageData = {
          _id: newMessage._id,
          ...populatedMessage.toObject(),
          createdAt: newMessage.createdAt,
          updatedAt: newMessage.updatedAt
        };

        // Update sender's lastSeen
        await User.findByIdAndUpdate(senderId, {
          lastSeen: new Date()
        });

        // Notify sender IMMEDIATELY (for all their windows)
        io.to(`user:${senderId}`).emit("message:sent", {
          chat: messageData
        });

        if (isAIBot) {
          // AI Bot logic
          // 1. Mark user message as delivered immediately
          await Chat.findByIdAndUpdate(newMessage._id, { status: "delivered" });
          io.to(`user:${senderId}`).emit("message:status", {
            messageId: newMessage._id,
            status: "delivered",
          });

          // 2. Emit typing indicator from AI to User
          io.to(`user:${senderId}`).emit("user:typing", {
            userId: receiverId,
            isTyping: true,
          });

          // 3. Generate response using Gemini
          let aiResponseText = "Sorry, I am offline right now.";
          if (process.env.GEMINI_API_KEY) {
            try {
              if (!aiClient) {
                aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
              }
              const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: message,
              });
              aiResponseText = response.text || "I don't have an answer to that.";
            } catch (aiErr) {
              console.error("Gemini API Error:", aiErr);
              aiResponseText = "Oops! Something went wrong with my circuits: " + aiErr.message;
            }
          } else {
            console.log("❌ GEMINI_API_KEY is missing on the server!");
            aiResponseText = "Sorry, my API key is missing on the server. Please add GEMINI_API_KEY in Render Environment Variables.";
          }

          // 4. Save AI Response
          const aiMessage = await Chat.create({
            senderId: receiverId,
            receiverId: senderId,
            message: aiResponseText,
            messageType: "text",
            status: "delivered",
          });

          const populatedAiMessage = await Chat.findById(aiMessage._id)
            .populate("senderId", "name email profilePicture")
            .populate("receiverId", "name email");

          const aiMessageData = {
            _id: aiMessage._id,
            ...populatedAiMessage.toObject(),
            createdAt: aiMessage.createdAt,
            updatedAt: aiMessage.updatedAt,
            status: "delivered"
          };

          // 5. Stop typing indicator
          io.to(`user:${senderId}`).emit("user:typing", {
            userId: receiverId,
            isTyping: false,
          });

          // 6. Send AI response to user
          // Check if user is currently looking at this chat (we can guess by connections, but to be safe we'll emit to them)
          io.to(`user:${senderId}`).emit("message:receive", {
            chat: aiMessageData,
            playSound: true,
            senderName: receiver.name
          });

          // Wait a tiny bit and emit a "seen" read receipt back to the user to clear unread automatically if they are active
          // This ensures the AI message is marked 'seen' if they are on the screen.
          // Better yet, the frontend handles marking it seen automatically.
          return; // Skip the rest of the standard receiver logic
        }

        // Standard user-to-user logic
        // Check if receiver has active connections
        const receiverConnections = userConnections.get(receiverId);
        if (receiverConnections && receiverConnections.size > 0) {
          // Mark as delivered
          await Chat.findByIdAndUpdate(newMessage._id, { status: "delivered" });

          const deliveredMessage = {
            ...messageData,
            status: "delivered"
          };

          // Notify sender about delivery
          io.to(`user:${senderId}`).emit("message:status", {
            messageId: newMessage._id,
            status: "delivered",
          });

          // Send to receiver with NOTIFICATION SOUND
          io.to(`user:${receiverId}`).emit("message:receive", {
            chat: deliveredMessage,
            playSound: true,
            senderName: populatedMessage.senderId.name
          });

          // Update receiver's lastSeen
          await User.findByIdAndUpdate(receiverId, {
            lastSeen: new Date()
          });
        }

      } catch (error) {
        console.error("Message send error:", error);
      }
    });

    // Typing indicators
    socket.on("typing:start", (data) => {
      const { senderId, receiverId } = data;
      // Broadcast to receiver's personal room
      io.to(`user:${receiverId}`).emit("user:typing", {
        userId: senderId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (data) => {
      const { senderId, receiverId } = data;
      io.to(`user:${receiverId}`).emit("user:typing", {
        userId: senderId,
        isTyping: false,
      });
    });

    // Mark messages as seen
    socket.on("messages:seen:all", async (data) => {
      try {
        const { senderId, receiverId } = data;

        // Mark messages as seen
        await Chat.updateMany(
          {
            senderId: senderId,
            receiverId: receiverId,
            status: { $ne: "seen" }
          },
          { status: "seen" }
        );

        // Notify sender
        io.to(`user:${senderId}`).emit("messages:seen:bulk", {
          senderId,
          receiverId,
        });

      } catch (error) {
        console.error("Mark seen error:", error);
      }
    });

    // Disconnect handler - FIXED: No flickering offline/online
    socket.on("disconnect", async () => {
      try {
        console.log(`🔴 Socket disconnected: ${socket.id}`);

        const userId = socket.userId;
        if (userId) {
          // Remove from connections
          const connections = userConnections.get(userId);
          if (connections) {
            connections.delete(socket.id);

            // If no more connections, mark as offline
            if (connections.size === 0) {
              userConnections.delete(userId);

              // Broadcast offline status AFTER delay (prevent flickering)
              setTimeout(async () => {
                // 🔥 DOUBLE CHECK: sending offline only if user hasn't reconnected
                if (!userConnections.has(userId)) {
                  console.log(`👤 Confirming User ${userId} offline`);

                  const user = await User.findById(userId);
                  if (user) {
                    user.isOnline = false;
                    user.lastSeen = new Date();
                    user.socketIds = [];
                    await user.save();
                  }

                  io.emit("user:status:update", {
                    userId: userId,
                    isOnline: false,
                    lastSeen: new Date(),
                  });
                } else {
                  console.log(`👤 User ${userId} reconnected, cancelling offline broadcast`);
                }
              }, 1000);

              console.log(`User ${userId} went offline (pending check)`);
            } else {
              // Still has other connections
              const user = await User.findById(userId);
              if (user) {
                user.socketIds = Array.from(connections);
                await user.save();
              }
              console.log(`User ${userId} has ${connections.size} remaining connection(s)`);
            }
          }
        }
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    });

    // Force logout from all devices
    socket.on("force:logout", async (userId) => {
      try {
        const connections = userConnections.get(userId);
        if (connections) {
          // Disconnect all sockets for this user
          connections.forEach(socketId => {
            io.to(socketId).emit("force:logout");
            io.sockets.sockets.get(socketId)?.disconnect(true);
          });
          userConnections.delete(userId);
        }

        const user = await User.findById(userId);
        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          user.socketIds = [];
          await user.save();
        }

        // Broadcast offline status immediately
        io.emit("user:status:update", {
          userId: userId,
          isOnline: false,
          lastSeen: new Date(),
        });

      } catch (error) {
        console.error("Force logout error:", error);
      }
    });
  });

  console.log("💬 Task5 Socket Handler initialized");
};