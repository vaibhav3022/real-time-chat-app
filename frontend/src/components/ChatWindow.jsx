import { useEffect, useRef, useState } from "react";
import { useChatContext } from "../context/ChatContext";
import { chatApi } from "../services/chatApi";
import { Phone, Video, MoreVertical, ChevronLeft, Home, MessageCircle, Clock, Shield, AlertCircle } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { useNavigate } from "react-router-dom";

const ChatWindow = ({ onBack }) => {
  const {
    selectedUser,
    messages,
    getMessagesForUser,
    setMessagesForUser,
    currentUser,
    onlineUsers,
    typingUsers,
    socket,
    setSelectedUser,
    fetchMessages,
    markMessagesAsSeen,
    lastSeenUpdates,
    logout
  } = useChatContext();

  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSeenRefresh, setLastSeenRefresh] = useState(Date.now());
  const [userStatus, setUserStatus] = useState({
    isOnline: false,
    lastSeen: null,
    typing: false
  });

  const currentMessages = getMessagesForUser(selectedUser?._id) || [];

  // ✅ Real-time status updates
  useEffect(() => {
    if (selectedUser) {
      const isOnline = onlineUsers.has(selectedUser._id);
      const isTyping = typingUsers.has(selectedUser._id);
      const lastSeen = lastSeenUpdates[selectedUser._id] || selectedUser.lastSeen;
      
      setUserStatus({
        isOnline,
        lastSeen,
        typing: isTyping
      });
    }
  }, [selectedUser, onlineUsers, typingUsers, lastSeenUpdates]);

  // ✅ Fetch messages when user is selected
  useEffect(() => {
    if (selectedUser) {
      const loadMessages = async () => {
        setIsLoading(true);
        await fetchMessages(selectedUser._id, true);
        setIsLoading(false);
        
        // Mark messages as seen
        setTimeout(() => {
          markMessagesAsSeen(selectedUser._id);
        }, 1000);
      };
      
      loadMessages();
    }
  }, [selectedUser?._id]);

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      scrollToBottom();
    }
  }, [currentMessages, userStatus.typing]);

  // ✅ Handle scroll position
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAtBottom(isBottom);
    }
  };

  // ✅ Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ Format last seen with real-time updates
  const formatLastSeen = (lastSeen, isOnline) => {
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
      year: diffDays > 365 ? "numeric" : undefined,
    });
  };

  // ✅ Get user initials
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // ✅ Handle back to chat list - IMPORTANT: This stays within chat!
  const handleBackToChatList = () => {
    // Just clear selected user and show sidebar (still in chat interface)
    setSelectedUser(null);
    
    // For mobile, hide chat window
    if (onBack) {
      onBack();
    }
    
    console.log("✅ Back to chat list (still in chat interface)");
  };

  // ✅ Handle go to main homepage - Shows warning
  const handleGoToMainHome = () => {
    const confirmLeave = window.confirm(
      "⚠️ Security Alert\n\n" +
      "Leaving chat without logging out will:\n" +
      "• Leave you logged in on server\n" +
      "• Show you as online when you're not\n" +
      "• May cause message sync issues\n\n" +
      "Please use the Logout button (top-right corner) instead.\n\n" +
      "Do you still want to force leave?"
    );
    
    if (confirmLeave) {
      // Clear minimal data and logout
      logout();
      navigate("/");
    }
  };

  // ✅ Auto-refresh last seen every minute
  useEffect(() => {
    if (selectedUser) {
      const interval = setInterval(() => {
        setLastSeenRefresh(Date.now());
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4 md:mb-6 mx-auto animate-pulse">
            <MessageCircle className="w-12 h-12 md:w-16 md:h-16 text-purple-600" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
            Welcome to ChatFlow
          </h2>
          <p className="text-sm md:text-base text-gray-600 mb-6">
            Select a conversation to start messaging
          </p>
          
          <div className="space-y-3">
            {/* <button
              onClick={handleGoToMainHome}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 mx-auto shadow-md hover:shadow-lg w-full max-w-xs"
            >
              <Home className="w-5 h-5" />
              <span>Go to Main Homepage</span>
            </button> */}
            
            {/* <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-amber-800 mb-1">Important Notice</p>
                  <p className="text-xs text-amber-600">
                    To properly exit chat, use the <strong>Logout button</strong> in the top-right corner.
                    Back button and URL changes are disabled for security.
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-3 md:p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
          {/* Back Button - Goes back to chat list (within chat) */}
          <button
            onClick={handleBackToChatList}
            className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
            title="Back to chats"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Avatar with status indicator */}
            <div className="relative flex-shrink-0">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-white text-sm md:text-base ${
                  userStatus.isOnline 
                    ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                    : "bg-gradient-to-br from-gray-400 to-gray-500"
                }`}
              >
                {getInitials(selectedUser.name)}
              </div>
              
              {/* Status indicator ring */}
              <div className={`absolute -inset-1 rounded-full border-2 ${
                userStatus.isOnline 
                  ? 'border-green-500 animate-pulse' 
                  : 'border-gray-300'
              }`}></div>
            </div>
            
            {/* User info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate text-sm md:text-base">
                {selectedUser.name}
              </h2>
              <div className="flex items-center space-x-1">
                {userStatus.typing ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 font-medium">Typing...</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 truncate">
                    {userStatus.isOnline ? (
                      <span className="text-green-600 font-medium">
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Last seen {formatLastSeen(userStatus.lastSeen, userStatus.isOnline)}</span>
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-1 md:space-x-2">
          <button 
            className="p-2 hover:bg-gray-100 rounded-full transition hidden md:block"
            title="Back to chats"
            onClick={handleBackToChatList}
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
          </button>
          
          <button 
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Voice call"
          >
            <Phone className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
          </button>
          <button 
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Video call"
          >
            <Video className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
          </button>
          <button 
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="More options"
          >
            <MoreVertical className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-3 md:p-4"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading messages...</p>
            </div>
          </div>
        ) : currentMessages.length === 0 ? (
          // Empty chat state
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {getInitials(selectedUser.name)}
                </span>
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              {selectedUser.name}
            </h3>
            <p className="text-gray-600 mb-1">
              {userStatus.isOnline ? (
                <span className="text-green-600 font-medium">
                  Online
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Last seen {formatLastSeen(userStatus.lastSeen, userStatus.isOnline)}</span>
                </span>
              )}
            </p>
            <p className="text-sm text-gray-400 max-w-md mb-6">
              This is the beginning of your conversation with {selectedUser.name}. 
              Send your first message to start chatting!
            </p>
            
            {/* Quick message suggestions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {["Hello!", "Hi there!", "How are you?", "Let's chat!"].map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    // Send quick message
                    if (socket && currentUser) {
                      socket.emit("message:send", {
                        senderId: currentUser.id,
                        receiverId: selectedUser._id,
                        message: msg,
                      });
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4 pb-4">
            {/* Date separator */}
            {currentMessages.length > 0 && (
              <div className="text-center my-4">
                <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}
            
            {currentMessages.map((message) => (
              <MessageBubble
                key={message._id || `${message.createdAt}-${message.senderId?._id || Math.random()}`}
                message={message}
                isOwn={message.senderId?._id === currentUser.id}
                getInitials={getInitials}
              />
            ))}

            {/* Typing indicator */}
            {userStatus.typing && (
              <div className="flex justify-start">
                <div className="flex items-end space-x-2 max-w-[75%]">
                  <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-xs">
                    {getInitials(selectedUser.name)}
                  </div>
                  <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex space-x-1 items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll to bottom button */}
            {!isAtBottom && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-24 right-4 md:right-6 p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all z-10"
                title="Scroll to bottom"
              >
                <ChevronLeft className="w-5 h-5 rotate-90" />
              </button>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <ChatInput />
    </div>
  );
};

export default ChatWindow;