import { useState, useEffect, useMemo } from "react";
import { X, Search, Send, User } from "lucide-react";
import { useChatContext } from "../context/ChatContext";

const ForwardModal = ({ message, onClose, onSend }) => {
  const { conversations } = useChatContext();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("chatToken");
        // Start with conversations as they are most likely targets
        // Then fetch all users to fill the list
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/task5/api/users?limit=50`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (data.success) {
            // Merge conversations and fetched users unique by ID
            const convoUsers = conversations.map(c => ({
                _id: c.userId,
                name: c.name,
                email: c.email,
                profilePicture: c.profilePicture,
                isRecent: true
            }));

            const allFetched = data.users.map(u => ({...u, isRecent: false}));
            
            // Map by ID to deduplicate
            const userMap = new Map();
            convoUsers.forEach(u => userMap.set(u._id, u));
            allFetched.forEach(u => {
                if (!userMap.has(u._id)) {
                    userMap.set(u._id, u);
                }
            });
            
            setUsers(Array.from(userMap.values()));
        }
      } catch (error) {
        console.error("Error fetching users for forward:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [conversations]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const toggleUser = (userId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSend = async () => {
    if (selectedUsers.size === 0) return;
    setSending(true);
    
    // Send to all selected users
    const userIds = Array.from(selectedUsers);
    await onSend(message, userIds);
    
    setSending(false);
    onClose();
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
          <h3 className="font-semibold text-gray-800">Forward Message</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-3 bg-gray-50 border-b border-gray-100 text-sm text-gray-600 truncate italic">
          <span className="font-medium mr-2">Forwarding:</span> 
          {message.messageType === 'image' ? '📷 Image' : message.messageType === 'voice' ? '🎤 Voice Note' : message.message}
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent w-full focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto px-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No users found</div>
          ) : (
            <div className="space-y-1 pb-2">
              {filteredUsers.map(user => (
                <button
                  key={user._id}
                  onClick={() => toggleUser(user._id)}
                  className={`w-full flex items-center p-2 rounded-lg transition ${
                    selectedUsers.has(user._id) ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 transition ${
                    selectedUsers.has(user._id) ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                  }`}>
                    {selectedUsers.has(user._id) && <User className="w-3 h-3 text-white" />}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs mr-3">
                    {getInitials(user.name)}
                  </div>
                  
                  <div className="text-left flex-1 min-w-0">
                    <p className={`text-sm truncate ${selectedUsers.has(user._id) ? 'font-semibold text-purple-900' : 'text-gray-800'}`}>
                      {user.name}
                    </p>
                    {user.isRecent && <p className="text-[10px] text-gray-400">Recent conversation</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end items-center bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-500 mr-auto">
                {selectedUsers.size} selected
            </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-lg mr-2 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={selectedUsers.size === 0 || sending}
            className={`px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg flex items-center space-x-2 transition ${
                selectedUsers.size === 0 || sending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
            }`}
          >
            {sending ? (
                <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                </>
            ) : (
                <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
