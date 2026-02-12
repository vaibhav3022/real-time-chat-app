import { useChatContext } from "../context/ChatContext";
import { Check, CheckCheck } from "lucide-react";

const UserList = ({ conversations, onlineUsers }) => {
  const { selectedUser, setSelectedUser, currentUser } = useChatContext();

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const truncateMessage = (message, maxLength = 30) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  const getStatusIcon = (status) => {
    if (status === "read") {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (status === "delivered") {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No Conversations Yet
        </h3>
        <p className="text-sm text-gray-500">
          Search for users to start chatting!
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const isOnline = onlineUsers.has(conv.userId);
        const isSelected = selectedUser?._id === conv.userId;

        return (
          <button
            key={conv.userId}
            onClick={() => setSelectedUser({ _id: conv.userId, ...conv })}
            className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition ${
              isSelected ? "bg-purple-50 border-l-4 border-purple-600" : ""
            }`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={conv.profilePicture || "https://via.placeholder.com/150"}
                alt={conv.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-800 truncate">
                  {conv.name}
                </h3>
                <span className="text-xs text-gray-500 ml-2">
                  {formatTime(conv.lastMessageTime)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 min-w-0 flex-1">
                  {conv.lastMessageStatus && getStatusIcon(conv.lastMessageStatus)}
                  <p className="text-sm text-gray-600 truncate">
                    {truncateMessage(conv.lastMessage)}
                  </p>
                </div>

                {conv.unreadCount > 0 && (
                  <span className="ml-2 bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default UserList;