import { Check, CheckCheck } from "lucide-react";

const MessageBubble = ({ message, isOwn, getInitials }) => {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;

    // ✅ FIX: Proper status icons
    if (message.status === "seen") {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (message.status === "delivered") {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex items-end space-x-2 max-w-[75%] md:max-w-md ${
          isOwn ? "flex-row-reverse space-x-reverse" : ""
        }`}
      >
        {/* Avatar - Only show for received messages */}
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {getInitials(message.senderId?.name || "U")}
          </div>
        )}

        {/* Message Bubble */}
        <div>
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base ${
              isOwn
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none"
                : "bg-white text-gray-800 rounded-bl-none"
            }`}
          >
            <p className="break-words">{message.message}</p>
          </div>

          {/* Time and Status */}
          <div
            className={`flex items-center space-x-1 mt-1 px-1 ${
              isOwn ? "justify-end" : "justify-start"
            }`}
          >
            <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
            {getStatusIcon()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;