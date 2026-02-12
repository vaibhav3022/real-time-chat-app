import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";

const ChatContext = createContext();

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState({});
  const [conversations, setConversations] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastSeenUpdates, setLastSeenUpdates] = useState({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  const messagesRef = useRef(messages);
  const conversationsRef = useRef(conversations);
  const onlineUsersRef = useRef(onlineUsers);

  // Update refs when state changes
  useEffect(() => {
    messagesRef.current = messages;
    conversationsRef.current = conversations;
    onlineUsersRef.current = onlineUsers;
  }, [messages, conversations, onlineUsers]);

  // ✅ Real-time fetch conversations
  const fetchConversations = useCallback(async (force = false) => {
    try {
      const token = localStorage.getItem("chatToken");
      const cacheKey = `chat_conversations_${currentUser?.id}`;
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      
      // Use cache if less than 5 seconds old and not forced
      if (!force && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 5000) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          setConversations(data.conversations || []);
          setTotalUnreadCount(data.totalUnread || 0);
          setNotificationCount(data.totalUnread || 0);
          return;
        }
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/task5/api/users/conversations/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
      });
      
      if (response.status === 401) {
        // Token expired
        logout();
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
        setTotalUnreadCount(data.totalUnread || 0);
        setNotificationCount(data.totalUnread || 0);
        
        // Update online users set
        const onlineSet = new Set();
        data.conversations?.forEach(conv => {
          if (conv.isOnline || conv.isActive) {
            onlineSet.add(conv.userId);
          }
        });
        setOnlineUsers(onlineSet);
        
        // Cache results
        localStorage.setItem(cacheKey, JSON.stringify({
          conversations: data.conversations,
          totalUnread: data.totalUnread,
          timestamp: data.timestamp
        }));
        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [currentUser?.id]);

  // ✅ Fetch messages for a user
  const fetchMessages = useCallback(async (userId, force = false) => {
    try {
      const token = localStorage.getItem("chatToken");
      const cacheKey = `chat_messages_${currentUser?.id}_${userId}`;
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      
      if (!force && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 30000) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          setMessages(prev => ({
            ...prev,
            [userId]: data.messages || []
          }));
          return;
        }
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/task5/api/chats/${userId}?limit=200`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => ({
          ...prev,
          [userId]: data.messages || []
        }));
        
        // Cache messages
        localStorage.setItem(cacheKey, JSON.stringify({
          messages: data.messages,
          timestamp: data.timestamp
        }));
        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, [currentUser?.id]);

  // ✅ Handle new message with sound notification
  const handleNewMessage = useCallback((message, options = {}) => {
    const senderId = message.senderId?._id || message.senderId;
    const receiverId = message.receiverId?._id || message.receiverId;
    
    if (!senderId || !receiverId) return;

    // Check if message is from current user
    const isFromCurrentUser = senderId === currentUser?.id;
    
    // Update messages state
    setMessages(prev => {
      const updated = { ...prev };
      
      // Add to sender's messages
      if (!updated[senderId]) updated[senderId] = [];
      const existsInSender = updated[senderId].find(m => m._id === message._id);
      if (!existsInSender) {
        updated[senderId] = [...updated[senderId], message];
        updated[senderId].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
      
      // Add to receiver's messages
      if (!updated[receiverId]) updated[receiverId] = [];
      const existsInReceiver = updated[receiverId].find(m => m._id === message._id);
      if (!existsInReceiver) {
        updated[receiverId] = [...updated[receiverId], message];
        updated[receiverId].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
      
      return updated;
    });

    // Update conversations & Unread Counts
    setConversations(prev => {
      const updated = [...prev];
      const conversationIndex = updated.findIndex(c => c.userId === (isFromCurrentUser ? receiverId : senderId));
      
      const isChatOpen = selectedUser?._id === (isFromCurrentUser ? receiverId : senderId);

      if (conversationIndex !== -1) {
        // Update existing conversation
        const conv = updated[conversationIndex];
        
        updated[conversationIndex] = {
          ...conv,
          lastMessage: message.messageType === 'image' ? '📷 Image' : message.messageType === 'voice' ? '🎤 Voice Note' : message.message,
          lastMessageTime: message.createdAt,
          lastMessageStatus: isChatOpen && !isFromCurrentUser ? 'seen' : message.status,
          unreadCount: (isFromCurrentUser || isChatOpen) ? 0 : (conv.unreadCount || 0) + 1
        };
        
        // Move to top
        updated.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      } else {
        // New conversation - fetch to get full details
        fetchConversations(true);
      }
      return updated;
    });

    // Clear cache for this conversation
    const cacheKey = `chat_messages_${currentUser?.id}_${senderId === currentUser?.id ? receiverId : senderId}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    
    // Trigger sound notification if not from current user AND chat is NOT open
    const isChatOpen = selectedUser?._id === senderId;
    if (!isFromCurrentUser) {
      if (options.playSound && !isChatOpen) {
        // Dispatch custom event for sound
        window.dispatchEvent(new CustomEvent('newMessageNotification', {
          detail: { playSound: true, senderName: message.senderId?.name }
        }));
      }

      // 🔥 IMMEDIATE SEEN IF CHAT IS OPEN
      if (isChatOpen) {
        console.log("👀 Chat open, marking message as seen immediately");
        socket.emit("messages:seen:all", {
          senderId: senderId,
          receiverId: currentUser.id || currentUser._id,
        });
        
        // Optimistically update local message status
        if (message.status !== 'seen') {
           setMessages(prev => {
             const updated = { ...prev };
             if (updated[senderId]) {
               updated[senderId] = updated[senderId].map(m => 
                 m._id === message._id ? { ...m, status: 'seen' } : m
               );
             }
             return updated;
           });
        }
      }
    }
  }, [currentUser?.id, selectedUser?._id, fetchConversations, socket]);

  // ✅ Initialize socket connection
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("chatUser"));
    const token = localStorage.getItem("chatToken");

    if (user && token) {
      const userId = user.id || user._id; // Robust ID access
      console.log("🚀 Initializing chat with user:", userId);
      setCurrentUser(user);

      // 🔥 AUTO-FIX: Fetch fresh user data on mount
      fetch(`${import.meta.env.VITE_API_BASE_URL}/task5/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          console.log("✅ Fetched fresh user data:", data.user);
          setCurrentUser(data.user);
          localStorage.setItem("chatUser", JSON.stringify(data.user));
        }
      })
      .catch(err => console.error("Failed to refresh user data:", err));

      const newSocket = io(import.meta.env.VITE_API_BASE_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        query: { 
          userId: userId,
          token: token 
        },
      });

      // Connection handlers
      newSocket.on("connect", () => {
        console.log("✅ Socket connected:", newSocket.id);
        setIsConnected(true);
        
        // Join with user ID
        newSocket.emit("user:join", userId);
        
        // Initial fetch
        fetchConversations();
        
        // Start heartbeat
        newSocket.heartbeatInterval = setInterval(() => {
          if (newSocket.connected) {
            newSocket.emit("ping", { userId: userId });
          }
        }, 30000);
      });

      newSocket.on("connect_error", (error) => {
        console.error("❌ Connection error:", error);
        setIsConnected(false);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("🔴 Socket disconnected:", reason);
        setIsConnected(false);
      });

      // ✅ Real-time user status updates - FIXED: No flickering
      newSocket.on("user:status:update", (data) => {
        console.log("👤 Status update:", data);
        
        // Only update if status actually changed
        setOnlineUsers(prev => {
          const wasOnline = prev.has(data.userId);
          if (wasOnline === data.isOnline) return prev;
          
          const updated = new Set(prev);
          if (data.isOnline) {
            updated.add(data.userId);
          } else {
            updated.delete(data.userId);
          }
          return updated;
        });
        
        // Update last seen
        setLastSeenUpdates(prev => ({
          ...prev,
          [data.userId]: data.lastSeen
        }));

        // 🔥 Dispatch event for Sidebar to refresh all users list
        window.dispatchEvent(new Event('userStatusUpdate'));

        // 🔥 CHECK IF USER EXISTS IN CONVERSATIONS
        const userExists = conversationsRef.current.some(c => c.userId === data.userId);
        
        if (!userExists && data.isOnline) {
          console.log("🆕 New user online, fetching conversations...");
          fetchConversations(true);
        } else {
          // Update existing conversations
          setConversations(prev => prev.map(conv => {
            if (conv.userId === data.userId) {
              return {
                ...conv,
                isOnline: data.isOnline,
                lastSeen: data.lastSeen,
                isActive: data.isOnline || isRecentlyActive(data.lastSeen)
              };
            }
            return conv;
          }));
        }
        
        // Update selected user
        if (selectedUser && selectedUser._id === data.userId) {
          setSelectedUser(prev => ({
            ...prev,
            isOnline: data.isOnline,
            lastSeen: data.lastSeen
          }));
        }
      });

      // ✅ Online users list
      newSocket.on("users:online:list", (data) => {
        setOnlineUsers(new Set(data.onlineUsers || []));
      });

      // ✅ Message events
      newSocket.on("message:receive", (data) => {
        console.log("📩 Message received:", data.chat);
        handleNewMessage(data.chat, { playSound: data.playSound });
      });

      newSocket.on("message:sent", (data) => {
        console.log("✅ Message sent:", data.chat);
        handleNewMessage(data.chat);
      });

      newSocket.on("message:status", (data) => {
        console.log("📝 Message status:", data);
        
        setMessages(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(userId => {
            updated[userId] = updated[userId].map(msg =>
              msg._id === data.messageId ? { ...msg, status: data.status } : msg
            );
          });
          return updated;
        });
        
        fetchConversations(true);
      });

      newSocket.on("messages:seen:bulk", (data) => {
        console.log("👀 Bulk seen:", data);
        
        setMessages(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(userId => {
            updated[userId] = updated[userId].map(msg => {
              const senderId = msg.senderId._id || msg.senderId;
              if (senderId === data.senderId && msg.status !== "seen") {
                return { ...msg, status: "seen" };
              }
              return msg;
            });
          });
          return updated;
        });
        
        fetchConversations(true);
      });

      // ✅ Typing indicators
      newSocket.on("user:typing", (data) => {
        console.log("⌨️ Typing:", data);
        setTypingUsers(prev => {
          const updated = new Set(prev);
          if (data.isTyping) {
            updated.add(data.userId);
          } else {
            updated.delete(data.userId);
          }
          return updated;
        });
      });

      // ✅ Force logout
      newSocket.on("force:logout", () => {
        console.log("🔒 Force logout received");
        logout();
      });

      setSocket(newSocket);

      // Periodic refresh (every 15 seconds)
      const refreshInterval = setInterval(() => {
        fetchConversations();
      }, 15000);

      // Cleanup
      return () => {
        clearInterval(refreshInterval);
        if (newSocket.heartbeatInterval) {
          clearInterval(newSocket.heartbeatInterval);
        }
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    }
  }, [currentUser?.id]);

  // ✅ Enhanced logout
  const logout = useCallback(async () => {
    try {
      // Notify server
      if (socket && currentUser) {
        socket.emit("force:logout", currentUser.id);
      }
      
      // Clear all chat-related cache
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('chat_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear state
      setCurrentUser(null);
      setSelectedUser(null);
      setMessages({});
      setConversations([]);
      setOnlineUsers(new Set());
      setTypingUsers(new Set());
      setIsConnected(false);
      setNotificationCount(0);
      setTotalUnreadCount(0);
      
      // Clear auth storage
      localStorage.removeItem("chatToken");
      localStorage.removeItem("chatUser");
      
      // Disconnect socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      
      console.log("✅ Logout successful");
      
    } catch (error) {
      console.error("❌ Logout error:", error);
    }
  }, [socket, currentUser]);

  // Helper functions
  const getMessagesForUser = (userId) => {
    return messages[userId] || [];
  };

  const setMessagesForUser = (userId, newMessages) => {
    setMessages(prev => ({
      ...prev,
      [userId]: newMessages
    }));
  };

  const sendMessage = (receiverId, message) => {
    if (socket && currentUser && receiverId && message.trim()) {
      console.log("📤 Sending message:", { receiverId, message });
      socket.emit("message:send", {
        senderId: currentUser.id || currentUser._id,
        receiverId,
        message: message.trim(),
      });
    }
  };

  const startTyping = (receiverId) => {
    if (socket && currentUser && receiverId) {
      socket.emit("typing:start", {
        senderId: currentUser.id || currentUser._id,
        receiverId,
      });
    }
  };

  const stopTyping = (receiverId) => {
    if (socket && currentUser && receiverId) {
      socket.emit("typing:stop", {
        senderId: currentUser.id || currentUser._id,
        receiverId,
      });
    }
  };

  const markMessagesAsSeen = (senderId) => {
    if (socket && currentUser && senderId) {
      socket.emit("messages:seen:all", {
        senderId: senderId,
        receiverId: currentUser.id || currentUser._id,
      });
    }
  };

  const deleteMessage = async (messageId, deleteForEveryone = false) => {
    try {
      const token = localStorage.getItem("chatToken");
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/task5/api/chats/${messageId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deleteForEveryone }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setMessages(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(userId => {
            updated[userId] = updated[userId].filter(msg => msg._id !== messageId);
          });
          return updated;
        });

        // If deleteForEveryone, socket logic might be needed here or handled by server broadcasting 'message:deleted'
        // Ideally server broadcasts it. For now, local update is good.
      }
    } catch (error) {
      console.error("Delete message error:", error);
    }
  };

  const value = {
    socket,
    currentUser,
    setCurrentUser,
    selectedUser,
    setSelectedUser,
    messages,
    setMessages,
    getMessagesForUser,
    setMessagesForUser,
    conversations,
    setConversations,
    onlineUsers,
    typingUsers,
    isConnected,
    notificationCount,
    totalUnreadCount,
    lastSeenUpdates,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsSeen,
    fetchConversations,
    fetchMessages,
    deleteMessage,
    logout,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Helper function
function isRecentlyActive(lastSeen, thresholdMinutes = 5) {
  if (!lastSeen) return false;
  const now = new Date();
  const diffMs = now - new Date(lastSeen);
  return diffMs < thresholdMinutes * 60000;
}