import { useState, useEffect, useRef } from "react";
import { Check, CheckCheck, Clock, Trash2, Copy, Forward } from "lucide-react";
import { useChatContext } from "../context/ChatContext";

const MessageBubble = ({ message, isOwn, getInitials }) => {
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
        return <CheckCheck className="w-4 h-4 text-[#53bdeb]" />; // WhatsApp Blue
      case "delivered":
        return <CheckCheck className="w-4 h-4 text-gray-500" />;
      case "sent":
        return <Check className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu(true);
    setMenuPosition({ x: e.pageX, y: e.pageY });
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
      deleteMessage(message._id, true); // Delete for everyone by default for now
    }
    setShowMenu(false);
  };

  const handleForward = () => {
    alert("Forward feature coming soon!");
    setShowMenu(false);
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-fadeIn mb-1 relative`}>
      <div
        onContextMenu={handleContextMenu}
        className={`flex items-end space-x-2 max-w-[85%] md:max-w-[65%] ${
          isOwn ? "flex-row-reverse space-x-reverse" : ""
        } cursor-pointer`}
      >
        {/* Avatar - Only for received messages */}
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0 shadow-sm border border-gray-100">
            {getInitials(message.senderId?.name || "U")}
          </div>
        )}

        {/* Message Bubble - WhatsApp Style */}
        <div className="relative group">
          <div
            className={`px-3 py-2 rounded-lg shadow-sm text-sm md:text-[15px] leading-relaxed relative ${
              isOwn
                ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none" // WhatsApp Light Green
                : "bg-white text-gray-900 rounded-tl-none border border-gray-100"
            }`}
          >
            {message.messageType === 'image' ? (
              <div className="mb-1">
                <img 
                  src={`http://localhost:5000/task5${message.message}`} 
                  alt="Shared image" 
                  className="rounded-lg max-w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => window.open(`http://localhost:5000/task5${message.message}`, '_blank')}
                />
              </div>
            ) : message.messageType === 'voice' ? (
              <div className="flex items-center space-x-2 min-w-[200px] mb-1">
                <audio 
                  controls 
                  src={`http://localhost:5000/task5${message.message}`} 
                  className="w-full max-w-[250px] h-8"
                />
              </div>
            ) : (
              <p className="break-words whitespace-pre-wrap pr-16 min-w-[80px] pb-1">{message.message}</p>
            )}
            
            {/* Message time and status */}
            <div className={`absolute bottom-1 right-2 flex items-center space-x-1 ${isOwn ? 'opacity-100' : 'opacity-70'}`}>
              <span className="text-[10px] text-gray-500 font-medium">
                {formatTime(message.createdAt)}
              </span>
              {isOwn && getStatusIcon()}
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          style={{ top: menuPosition.y, left: menuPosition.x }}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[150px] animate-fadeIn"
        >
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </button>
          <button
            onClick={handleForward}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
          >
            <Forward className="w-4 h-4" />
            <span>Forward</span>
          </button>
          {isOwn && (
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 border-t border-gray-100"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Add fade-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;
document.head.appendChild(style);

export default MessageBubble;