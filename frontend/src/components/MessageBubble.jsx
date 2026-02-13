import { useState, useEffect, useRef } from "react";
import { Check, CheckCheck, Clock, Trash2, Copy, Forward, Reply } from "lucide-react";
import { useChatContext } from "../context/ChatContext";

const MessageBubble = ({ message, isOwn, getInitials, onForward }) => {
  const { deleteMessage } = useChatContext();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case "seen":
        return <CheckCheck className="w-3.5 h-3.5 text-blue-200" />; // Lighter blue for contrast on gradient
      case "delivered":
        return <CheckCheck className="w-3.5 h-3.5 text-white/70" />;
      case "sent":
        return <Check className="w-3.5 h-3.5 text-white/70" />;
      default:
        return <Clock className="w-3 h-3 text-white/50" />;
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu(true);
    // Adjust position to stay in viewport
    const x = Math.min(e.pageX, window.innerWidth - 160);
    const y = Math.min(e.pageY, window.innerHeight - 200);
    setMenuPosition({ x, y });
  };

  const handleClickOutside = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setShowMenu(false);
    }
  };

  useEffect(() => {
    if (showMenu) {
      document.addEventListener("click", handleClickOutside);
    } else {
      document.removeEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMenu]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.message);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirm("Delete this message?")) {
      deleteMessage(message._id, true);
    }
    setShowMenu(false);
  };

  const handleForward = () => {
    if (onForward) {
      onForward(message);
    }
    setShowMenu(false);
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 group relative animate-fade-in`}>
      <div
        onContextMenu={handleContextMenu}
        className={`flex items-end max-w-[85%] md:max-w-[70%] lg:max-w-[60%] ${
          isOwn ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar - Only for received messages */}
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0 mr-2 mb-1">
            {getInitials(message.senderId?.name || "U")}
          </div>
        )}

        {/* Message Bubble */}
        <div className={`relative px-4 py-2.5 shadow-md text-sm md:text-[15px] leading-relaxed transition-all duration-200 hover:shadow-lg ${
            isOwn
            ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-sm"
            : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm"
        }`}>
            
            {message.messageType === 'image' ? (
              <div className="mb-1 -mx-2 -mt-2">
                <img 
                  src={`${import.meta.env.VITE_API_BASE_URL}/task5${message.message}`} 
                  alt="Shared image" 
                  className={`max-w-full h-auto max-h-72 object-cover cursor-pointer hover:opacity-95 transition-opacity ${
                      isOwn ? "rounded-t-xl rounded-b-sm" : "rounded-t-xl rounded-b-sm"
                  }`}
                  onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL}/task5${message.message}`, '_blank')}
                />
              </div>
            ) : message.messageType === 'voice' ? (
              <div className="flex items-center space-x-2 min-w-[200px] mb-1 py-1">
                <audio 
                  controls 
                  src={`${import.meta.env.VITE_API_BASE_URL}/task5${message.message}`} 
                  className="w-full h-8"
                  // Note: Styling native audio controls is hard, but custom players are complex. 
                  // For now, keeping native but wrapping nicely.
                />
              </div>
            ) : (
                <p className="break-words whitespace-pre-wrap pb-2">{message.message}</p>
            )}

            {/* Time & Status */}
            <div className={`flex items-center justify-end space-x-1 mt-0.5 ${isOwn ? "text-indigo-100" : "text-gray-400"}`}>
                <span className="text-[10px] font-medium opacity-90">
                    {formatTime(message.createdAt)}
                </span>
                {isOwn && getStatusIcon()}
            </div>
        </div>

        {/* Context Menu Trigger (Three dots on hover - optional, but context menu is better) */}

      </div>

      {/* Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          style={{ top: menuPosition.y, left: menuPosition.x }}
          className="fixed z-50 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/50 py-1.5 min-w-[160px] animate-scale-in"
        >
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center space-x-3 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span className="font-medium">Copy</span>
          </button>
          <button
            onClick={handleForward}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center space-x-3 transition-colors"
          >
            <Forward className="w-4 h-4" />
            <span className="font-medium">Forward</span>
          </button>
          {isOwn && (
            <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                onClick={handleDelete}
                className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center space-x-3 transition-colors"
                >
                <Trash2 className="w-4 h-4" />
                <span className="font-medium">Delete</span>
                </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;