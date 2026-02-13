import { useState, useEffect, useMemo } from "react";
import { LogOut, Search, X, MessageCircle, Bell, User, Shield, Volume2, VolumeX, AlertCircle, Check } from "lucide-react";
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
  
  // const [showNotifications, setShowNotifications] = useState(false); // Removed for inline section
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
        try {
            const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg"); 
            audio.volume = 0.5;
            audio.play().catch(e => console.log(e));
        } catch (e) {
            console.error(e);
        }
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
    <div className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-100 flex flex-col h-full shadow-md z-20">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-5 shadow-lg relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black opacity-10 rounded-full blur-xl"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  {currentUser?.profilePicture ? (
                    <img
                      src={currentUser.profilePicture}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    getInitials(currentUser?.name)
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-purple-600 shadow-sm"></div>
              </div>
              <div className="text-white min-w-0">
                <h2 className="font-semibold text-lg truncate tracking-tight">
                  {currentUser?.name || "Loading..."}
                </h2>
                <div className="flex items-center space-x-2 text-xs text-white/80 font-medium">
                  <span className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                    Online
                  </span>
                  {totalUnreadCount > 0 && (
                    <span className="bg-rose-500/90 text-white px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                      {totalUnreadCount} new
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleSound}
                className={`p-2 rounded-full transition-all duration-200 ${
                  playSound 
                    ? 'bg-white/20 text-white hover:bg-white/30 shadow-sm' 
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
                title={playSound ? "Mute" : "Unmute"}
              >
                {playSound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
              {/* Bell Icon now acts as a jump-to-top or indicator */}
              <div className="relative">
                <div
                  className={`p-2 rounded-full transition-all duration-200 ${
                    totalUnreadCount > 0 ? 'bg-white/20 text-white animate-pulse' : 'bg-white/10 text-white/50'
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-purple-500 shadow-sm">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleLogoutClick}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition text-white/80 hover:text-white"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modern Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-indigo-100 group-focus-within:text-white transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 border-none rounded-xl leading-5 bg-white/10 text-white placeholder-indigo-100 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/30 transition-all shadow-inner backdrop-blur-sm sm:text-sm"
              placeholder="Search conversations..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-indigo-100 hover:text-white cursor-pointer" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
        {/* Inline Unread Section */}
        {!searchQuery && notificationCount > 0 && (
            <div className="mb-4 animate-fade-in">
                <div className="sticky top-0 z-10 bg-indigo-50/90 backdrop-blur-md border-b border-indigo-100 px-4 py-2 flex items-center justify-between shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center">
                        <Bell className="w-3 h-3 mr-1.5" />
                        Unread Messages
                    </h3>
                    <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {notificationCount} TOTAL
                    </span>
                </div>
                <div className="divide-y divide-indigo-50/50 bg-indigo-50/20">
                    {conversations.filter(c => c.unreadCount > 0).map(conv => (
                        <button
                            key={`unread-${conv.userId}`}
                            onClick={() => handleSelectUser(conv)}
                            className="w-full flex items-center space-x-3 p-3 transition-all hover:bg-white"
                        >
                            <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                    {conv.profilePicture ? (
                                      <img
                                        src={conv.profilePicture}
                                        alt={conv.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      getInitials(conv.name)
                                    )}
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                    {conv.unreadCount}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="font-bold text-gray-900 text-sm truncate">{conv.name}</p>
                                <p className="text-xs text-indigo-600 truncate font-medium">New message received</p>
                            </div>
                            <div className="text-[10px] text-gray-400 font-medium italic">
                                {formatTime(conv.lastMessageTime)}
                            </div>
                        </button>
                    ))}
                </div>
                <div className="h-0.5 bg-indigo-100/50"></div>
            </div>
        )}

        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {searchQuery ? "Search Results" : "Recent Chats"}
          </h3>
          <div className="flex items-center space-x-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            <div className={`w-1.5 h-1.5 rounded-full ${onlineUsers.size > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-[10px] font-bold text-emerald-700">
              {onlineUsers.size} ONLINE
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {(searchQuery ? filteredUsers : sortedConversations).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center h-64">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4 shadow-inner">
                {searchQuery ? (
                  <User className="w-8 h-8 text-gray-400" />
                ) : (
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <p className="text-gray-500 font-medium">
                {searchQuery ? "No users found" : "No conversations yet"}
              </p>
              {!searchQuery && (
                <p className="text-xs text-gray-400 mt-2 max-w-[200px]">
                  Use the search bar to find friends and start chatting
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
                  className={`w-full flex items-center space-x-3.5 p-3.5 transition-all duration-200 group relative overflow-hidden ${
                    isSelected 
                      ? "bg-white z-10 shadow-md border-l-4 border-l-purple-500" 
                      : "hover:bg-white hover:shadow-sm border-l-4 border-l-transparent"
                  }`}
                >
                  {/* Active State Background Gradient (Subtle) */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-transparent pointer-events-none"></div>
                  )}

                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden font-bold text-base shadow-sm ring-2 ring-white transition-all transform group-hover:scale-105 ${
                        isOnline 
                          ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white" 
                          : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600"
                      }`}
                    >
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm ring-1 ring-emerald-50"></div>
                    )}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0 text-left relative z-10">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`font-semibold text-sm truncate transition-colors ${
                        isSelected ? 'text-purple-700' : 'text-gray-900 group-hover:text-gray-800'
                      } ${hasUnread ? 'font-bold' : ''}`}>
                        {user.name}
                      </h3>
                      {(user.lastMessageTime || user.lastSeen) && (
                        <span className={`text-[10px] font-medium flex-shrink-0 transition-colors ${
                          hasUnread ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-500'
                        }`}>
                          {formatTime(user.lastMessageTime || user.lastSeen)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {user.lastMessage ? (
                        <>
                          <p className={`text-xs truncate flex-1 mr-2 transition-colors ${
                            hasUnread ? 'text-gray-800 font-semibold' : 'text-gray-500 group-hover:text-gray-600'
                          }`}>
                            {user.lastMessageStatus === 'seen' && user.userId === currentUser.id && ( // Check if *I* sent it and it was seen
                                 <Check className="w-3 h-3 inline-block mr-1 text-blue-500" />
                            )}
                            {user.lastMessage.length > 35
                              ? user.lastMessage.substring(0, 35) + "..."
                              : user.lastMessage}
                          </p>
                          {hasUnread && (
                            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-scale-in">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-gray-300'}`}></span>
                          <p className="text-xs text-gray-400 italic">
                            {isOnline ? "Active now" : "Offline"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 transform transition-all scale-100">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Logout?</h3>
            <p className="text-gray-500 text-center text-sm mb-6">
              Are you sure you want to end your session? You wont receive notifications until you login again.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelLogout}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                disabled={logoutInProgress}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium hover:shadow-lg hover:to-rose-700 transition flex items-center justify-center text-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {logoutInProgress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    ...
                  </>
                ) : (
                  "Logout"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;