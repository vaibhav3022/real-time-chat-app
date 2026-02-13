import { useState, useEffect, useMemo } from "react";
import { LogOut, Search, X, MessageCircle, Bell, User, Shield, Volume2, VolumeX, AlertCircle, Check, XCircle } from "lucide-react";
import { useChatContext } from "../context/ChatContext";
import { authApi } from "../services/chatApi";
import { useNavigate } from "react-router-dom";

const Sidebar = ({ onSelectChat }) => {
  const { 
    currentUser, 
    conversations, 
    onlineUsers, 
    setSelectedUser, 
    selectedUser, 
    fetchConversations,
    notificationCount,
    totalUnreadCount,
    logout
  } = useChatContext();
  
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutInProgress, setLogoutInProgress] = useState(false);
  
  const [showNotifications, setShowNotifications] = useState(false);
  // ✅ FIXED: Sound state with proper initialization
  const [playSound, setPlaySound] = useState(() => {
    const saved = localStorage.getItem('chat_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllUsers();
    fetchConversations();
  }, []);

  // Real-time refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      setLastRefresh(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchConversations]);

  // 🔥 Listen for user status updates to refresh list
  useEffect(() => {
    const handleStatusUpdate = () => {
      console.log("🔄 Refreshing user list due to status update...");
      fetchAllUsers();
    };

    // We can use the socket from context if we expose it, or listen to a window event
    // Since ChatContext handles the socket event, let's make ChatContext dispatch a window event
    window.addEventListener('userStatusUpdate', handleStatusUpdate);

    return () => {
      window.removeEventListener('userStatusUpdate', handleStatusUpdate);
    };
  }, []);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/task5/api/users?limit=100`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("chatToken")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAllUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // ✅ Logout handlers
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      setLogoutInProgress(true);
      
      // Use context logout (handles socket cleanup)
      if (logout) {
        await logout();
      } else {
        // Fallback
        await authApi.logout();
      }
      
      // Clear chat data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('chat_') || key === 'chatToken' || key === 'chatUser')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Navigate to login
      navigate("/login", { replace: true });
      
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local storage and navigate
      localStorage.removeItem("chatToken");
      localStorage.removeItem("chatUser");
      navigate("/login", { replace: true });
    } finally {
      setLogoutInProgress(false);
      setShowLogoutConfirm(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // ✅ FIXED: Toggle sound function
  const toggleSound = () => {
    const newSoundState = !playSound;
    setPlaySound(newSoundState);
    localStorage.setItem('chat_sound_enabled', newSoundState.toString());
    
    // Visual feedback
    console.log(newSoundState ? "🔊 Sound notifications ON" : "🔇 Sound notifications OFF");
    
    // Optional: Play a test sound when enabling
    if (newSoundState) {
      setTimeout(() => {
        playNotificationSound();
      }, 200);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return messageDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Real-time last seen formatting
  const formatLastSeen = useMemo(() => {
    return (lastSeen, isOnline) => {
      if (isOnline) return "Online";
      if (!lastSeen) return "Offline";
      
      const now = new Date();
      const seenDate = new Date(lastSeen);
      const diffMs = now - seenDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return seenDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };
  }, [lastRefresh]);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return allUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [searchQuery, conversations, allUsers]);

  // Handle user selection
  const handleSelectUser = (user) => {
    const userData = {
      _id: user.userId || user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      isOnline: onlineUsers.has(user.userId || user._id),
      lastSeen: user.lastSeen,
      lastActiveAt: user.lastActiveAt
    };
    
    setSelectedUser(userData);
    setSearchQuery("");
    
    if (onSelectChat && isMobile) {
      onSelectChat();
    }
  };

  // Sort conversations and include all users
  const sortedConversations = useMemo(() => {
    // 1. Create a map of existing conversations for quick lookup
    const convMap = new Map();
    conversations.forEach(c => convMap.set(c.userId, c));
    
    // 2. Merge allUsers into a unified list
    // - If user is in conversation, use conversation data (has unread count etc)
    // - If not, use user data from allUsers
    const unifiedList = allUsers.map(user => {
        const userId = user._id || user.userId;
        if (convMap.has(userId)) {
            return convMap.get(userId);
        }
        // Transform standard user to conversation-like object
        return {
            userId: userId,
            _id: userId,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            lastMessage: null,
            lastMessageTime: null,
            unreadCount: 0,
            isOnline: onlineUsers.has(userId),
            lastSeen: user.lastSeen
        };
    });

    // 3. Sort logic
    return unifiedList.sort((a, b) => {
      // Priority 1: Unread count
      const unreadA = a.unreadCount || 0;
      const unreadB = b.unreadCount || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;
      
      // Priority 2: Online status
      const onlineA = onlineUsers.has(a.userId || a._id);
      const onlineB = onlineUsers.has(b.userId || b._id);
      if (onlineA !== onlineB) return onlineB ? 1 : -1;
      
      // Priority 3: Last Message Time / Last Active
      const timeA = new Date(a.lastMessageTime || a.lastSeen || 0).getTime();
      const timeB = new Date(b.lastMessageTime || b.lastSeen || 0).getTime();
      
      // If times are essentially zero (never chatted, never seen), sort by name
      if (timeA === 0 && timeB === 0) {
        return (a.name || "").localeCompare(b.name || "");
      }

      return timeB - timeA;
    });
  }, [conversations, allUsers, onlineUsers, lastRefresh]);

  // Debug log
  useEffect(() => {
    console.log("📊 Sidebar Render:", {
      totalUsers: allUsers.length,
      conversations: conversations.length,
      online: onlineUsers.size,
      currentUser: currentUser
    });
  }, [allUsers, conversations, onlineUsers, currentUser]);

  return (
    <>
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-purple-600 font-bold text-lg shadow-lg">
                  {getInitials(currentUser?.name)}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              <div className="text-white flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate">
                  {currentUser?.name || "Loading..."}
                </h2>
                <div className="flex items-center space-x-1 text-sm text-white/90">
                  {totalUnreadCount > 0 && (
                    <span className="bg-white/30 px-1.5 py-0.5 rounded text-xs">
                      {totalUnreadCount} unread
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 flex-shrink-0">
              {/* Refresh Button */}
              <button
                onClick={() => {
                  console.log("🔄 Manual refresh triggered");
                  fetchConversations(true);
                  fetchAllUsers();
                }}
                className="p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-all"
                title="Refresh Connection"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              {/* ✅ FIXED: Sound Toggle Button */}
              <button
                onClick={toggleSound}
                className={`p-2 rounded-full transition-all duration-200 ${
                  playSound 
                    ? 'bg-white/30 text-white hover:bg-white/40' 
                    : 'bg-white/10 text-white/50 hover:bg-white/20'
                }`}
                title={playSound ? "Mute notifications (ON)" : "Unmute notifications (OFF)"}
              >
                {playSound ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>
              
              {/* Notification Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-full hover:bg-white/20 transition relative"
                >
                  <Bell className="w-5 h-5 text-white" />
                  {notificationCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-purple-600">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 overflow-hidden border border-gray-100 animate-fadeIn">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700 text-sm">Notifications</h3>
                        {notificationCount > 0 && (
                          <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
                            {notificationCount} new
                          </span>
                        )}
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto">
                        {conversations.filter(c => c.unreadCount > 0).length === 0 ? (
                          <div className="p-8 text-center text-gray-400">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No new notifications</p>
                          </div>
                        ) : (
                          conversations.filter(c => c.unreadCount > 0).map(conv => (
                            <button
                              key={conv.userId}
                              onClick={() => {
                                handleSelectUser(conv);
                                setShowNotifications(false);
                              }}
                              className="w-full text-left p-3 hover:bg-purple-50 transition border-b border-gray-50 flex items-start space-x-3 last:border-0"
                            >
                              <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm">
                                  {getInitials(conv.name)}
                                </div>
                                {conv.isOnline && (
                                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 text-sm truncate">{conv.name}</p>
                                <p className="text-xs text-gray-500 truncate font-medium">
                                  {conv.lastMessage || "Sent a message"}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {formatTime(conv.lastMessageTime)}
                                </p>
                              </div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            </button>
                          ))
                        )}
                      </div>
                      
                      {notificationCount > 0 && (
                        <div className="bg-gray-50 p-2 text-center border-t border-gray-100">
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="text-xs text-purple-600 font-medium hover:underline"
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* Logout button */}
              <button
                onClick={handleLogoutClick}
                disabled={logoutInProgress}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition disabled:opacity-50"
                title={logoutInProgress ? "Logging out..." : "Logout"}
              >
                {logoutInProgress ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <LogOut className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
              <Search className="w-5 h-5 text-white/80 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-transparent text-white placeholder-white/60 focus:outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-2"
                >
                  <X className="w-4 h-4 text-white/80 hover:text-white" />
                </button>
              )}
            </div>
          </div>
          
          {/* Security info */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1 text-white/70">
              <Shield className="w-3 h-3" />
              <span>End-to-end encrypted</span>
            </div>
            <div className="text-white/60">
              {onlineUsers.size} online
            </div>
          </div>
        </div>

        {/* Users/Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {searchQuery ? "Search Results" : "Conversations"}
              {!searchQuery && sortedConversations.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({sortedConversations.length})
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${onlineUsers.has(currentUser?.id) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-500">
                {onlineUsers.size} online
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {(searchQuery ? filteredUsers : sortedConversations).length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  {searchQuery ? (
                    <User className="w-10 h-10 text-gray-400" />
                  ) : (
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {searchQuery ? "No users found" : "No conversations yet"}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-gray-400 mt-1">
                    Start a conversation by searching for users
                  </p>
                )}
              </div>
            ) : (
              (searchQuery ? filteredUsers : sortedConversations).map((user) => {
                const userId = user.userId || user._id;
                const isOnline = onlineUsers.has(userId);
                const isSelected = selectedUser?._id === userId;
                const unreadCount = user.unreadCount || 0;
                const hasUnread = unreadCount > 0;

                return (
                  <button
                    key={userId}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-all duration-200 ${
                      isSelected 
                        ? "bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500" 
                        : ""
                    } ${hasUnread ? 'bg-blue-50/50' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shadow-sm ${
                          isOnline 
                            ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                            : "bg-gradient-to-br from-gray-400 to-gray-500"
                        }`}
                      >
                        {getInitials(user.name)}
                      </div>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-800 truncate text-base">
                          {user.name}
                          {hasUnread && (
                            <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                          )}
                        </h3>
                        {(user.lastMessageTime || user.lastSeen) && (
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatTime(user.lastMessageTime || user.lastSeen)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        {user.lastMessage ? (
                          <>
                            <p className="text-sm text-gray-600 truncate flex-1 mr-2">
                              {user.lastMessage.length > 30
                                ? user.lastMessage.substring(0, 30) + "..."
                                : user.lastMessage}
                            </p>
                            {hasUnread && (
                              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] h-[20px] flex items-center justify-center">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            {!user.lastMessage && !searchQuery && (
                              <span className="text-xs text-gray-400">Start chat</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${onlineUsers.size > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <p className="text-xs text-gray-600">
                {onlineUsers.size} online • {sortedConversations.length} chats
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleSound}
                className={`text-xs flex items-center space-x-1 px-2 py-1 rounded ${
                  playSound ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'
                }`}
                title={playSound ? "Sound ON" : "Sound OFF"}
              >
                {playSound ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                <span>{playSound ? "ON" : "OFF"}</span>
              </button>
              <p className="text-xs text-gray-500">ChatFlow</p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto overflow-hidden border border-purple-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-500 p-6 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Confirm Logout</h3>
                  <p className="text-white/90 text-sm">
                    Are you sure you want to logout from ChatFlow?
                  </p>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 mb-1">Important Note:</h4>
                      <ul className="text-sm text-amber-700 space-y-1">
                        <li className="flex items-center">
                          <Check className="w-3 h-3 mr-2" />
                          All your messages are saved on the server
                        </li>
                        <li className="flex items-center">
                          <Check className="w-3 h-3 mr-2" />
                          Your status will be updated to offline
                        </li>
                        <li className="flex items-center">
                          <Check className="w-3 h-3 mr-2" />
                          You'll need to login again to continue chatting
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">Active Conversations:</p>
                    <p>{sortedConversations.length} chats • {onlineUsers.size} online</p>
                  </div>
                  <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">Unread Messages:</p>
                    <p>{totalUnreadCount} unread messages</p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={confirmLogout}
                  disabled={logoutInProgress}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white font-semibold rounded-lg hover:from-red-700 hover:to-orange-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {logoutInProgress ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Logging out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      <span>Yes, Logout Now</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={cancelLogout}
                  disabled={logoutInProgress}
                  className="w-full py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 transition-all border border-gray-300 flex items-center justify-center space-x-2"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Cancel, Stay in Chat</span>
                </button>
                
                <div className="pt-3 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-500">
                    You can also logout using the Logout button in the navigation bar
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                ChatFlow Security • Logout Protection Enabled
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;