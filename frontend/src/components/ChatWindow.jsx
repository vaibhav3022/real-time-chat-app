import { useEffect, useRef, useState, useMemo } from "react";
import { useChatContext } from "../context/ChatContext";
import { Phone, Video, MoreVertical, ChevronLeft, MessageCircle, Clock, Send, ArrowDown } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { useNavigate } from "react-router-dom";
import ForwardModal from "./ForwardModal";

const ChatWindow = ({ onBack }) => {
  const {
    selectedUser,
    getMessagesForUser,
    sendMessage,
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
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const currentMessages = getMessagesForUser(selectedUser?._id) || [];

  // Derived user status
  const userStatus = useMemo(() => {
    if (!selectedUser) return { isOnline: false, lastSeen: null, typing: false };
    return {
      isOnline: onlineUsers.has(selectedUser._id),
      typing: typingUsers.has(selectedUser._id),
      lastSeen: lastSeenUpdates[selectedUser._id] || selectedUser.lastSeen
    };
  }, [selectedUser, onlineUsers, typingUsers, lastSeenUpdates]);

  // Fetch messages
  useEffect(() => {
    if (selectedUser) {
      const loadMessages = async () => {
        setIsLoading(true);
        await fetchMessages(selectedUser._id, true);
        setIsLoading(false);
        setTimeout(() => markMessagesAsSeen(selectedUser._id), 500);
      };
      loadMessages();
    }
  }, [selectedUser?._id]);

  // Auto-scroll
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages, userStatus.typing]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isBottom = scrollHeight - scrollTop - clientHeight < 150;
      setIsAtBottom(isBottom);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Offline";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
  };

  const getInitials = (name) => {
    return name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";
  };

  const handleBackToChatList = () => {
    setSelectedUser(null);
    if (onBack) onBack();
  };

  // ✅ Forwarding Logic
  const handleForwardMessage = (message) => {
    setMessageToForward(message);
    setShowForwardModal(true);
  };

  const handleSendForward = async (originalMessage, targetUserIds) => {
    if (!originalMessage || !targetUserIds.length) return;
    
    targetUserIds.forEach(userId => {
        if (originalMessage.messageType === 'image' || originalMessage.messageType === 'voice') {
             if (socket && currentUser) {
              socket.emit("message:send", {
                senderId: currentUser.id || currentUser._id,
                receiverId: userId,
                message: originalMessage.message,
                messageType: originalMessage.messageType
              });
            }
        } else {
             sendMessage(userId, originalMessage.message);
        }
    });
    setShowForwardModal(false);
    setMessageToForward(null);
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
      const groups = {};
      currentMessages.forEach(msg => {
          const date = new Date(msg.createdAt).toLocaleDateString();
          if (!groups[date]) groups[date] = [];
          groups[date].push(msg);
      });
      return groups;
  }, [currentMessages]);


  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-6 text-center animate-fade-in">
        <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-float">
          <MessageCircle className="w-16 h-16 text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ChatFlow</h2>
        <p className="text-gray-500 max-w-sm">
          Select a conversation from the sidebar to start chatting globally with ease.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* 🟢 Modern Glass Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-3 py-2 md:px-4 md:py-3 flex items-center justify-between shadow-sm transition-all duration-300">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 mr-2">
          {/* Back Button - Visible on Mobile */}
          <button
            onClick={handleBackToChatList}
            className="md:hidden p-2 -ml-1 rounded-full hover:bg-gray-100/80 text-gray-700 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="relative flex-shrink-0">
            <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white ${
                userStatus.isOnline 
                ? "bg-gradient-to-br from-emerald-400 to-teal-500" 
                : "bg-gradient-to-br from-gray-400 to-gray-500"
            }`}>
              {getInitials(selectedUser.name)}
            </div>
            {userStatus.isOnline && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 truncate text-sm md:text-lg leading-tight">
              {selectedUser.name}
            </h2>
            <div className="flex items-center space-x-1.5 h-4">
              {userStatus.typing ? (
                 <span className="text-xs font-bold text-indigo-600 animate-pulse">Typing...</span>
              ) : userStatus.isOnline ? (
                 <span className="text-xs font-medium text-emerald-600">Online</span>
              ) : (
                 <span className="text-xs text-gray-400 truncate">Last seen {formatLastSeen(userStatus.lastSeen)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 md:gap-2 flex-shrink-0">
            <button className="p-2.5 rounded-full hover:bg-gray-100/80 text-gray-500 transition-all active:scale-95">
                <Phone className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-full hover:bg-gray-100/80 text-gray-500 transition-all active:scale-95 hidden sm:block">
                <Video className="w-5 h-5" />
            </button>
            <button 
                className="p-2.5 rounded-full hover:bg-gray-100/80 text-gray-500 transition-all active:scale-95"
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            >
                <MoreVertical className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* 🟠 Chat Background & Messages */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto chat-bg pt-20 pb-4 px-2 md:px-4 lg:px-6 custom-scrollbar scroll-smooth"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : currentMessages.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center opacity-60">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">👋</span>
              </div>
              <p className="text-gray-500 font-medium">Say hello to {selectedUser.name}!</p>
           </div>
        ) : (
            <div className="space-y-6 pb-2">
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                        <div className="flex justify-center mb-4 sticky top-2 z-10">
                            <span className="bg-gray-100/80 backdrop-blur-sm text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-gray-200/50 uppercase tracking-wide">
                                {date === new Date().toLocaleDateString() ? 'Today' : date}
                            </span>
                        </div>
                        {msgs.map((msg) => (
                            <MessageBubble
                                key={msg._id || msg.createdAt}
                                message={msg}
                                isOwn={msg.senderId?._id === currentUser.id}
                                getInitials={getInitials}
                                onForward={handleForwardMessage}
                            />
                        ))}
                    </div>
                ))}
            </div>
        )}

        {/* Typing Indicator Bubble */}
        {userStatus.typing && (
           <div className="flex items-center space-x-2 mb-2 animate-fade-in pl-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                  {getInitials(selectedUser.name)}
              </div>
              <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
           </div>
        )}
        
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* 🔵 Floating Scroll Button */}
      {!isAtBottom && (
          <button 
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 p-3 bg-white text-indigo-600 rounded-full shadow-lg border border-indigo-100 hover:shadow-xl transition-all z-30 animate-scale-in group"
          >
              <ArrowDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              {/* Unread badge could go here */}
          </button>
      )}

      {/* 🟣 Input Area - Floating & Clean */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-gray-100 p-3 md:p-4 z-20">
         <ChatInput />
      </div>

       {/* Forward Modal */}
       {showForwardModal && messageToForward && (
        <ForwardModal
            message={messageToForward}
            onClose={() => {
                setShowForwardModal(false);
                setMessageToForward(null);
            }}
            onSend={handleSendForward}
        />
      )}
    </div>
  );
};

export default ChatWindow;