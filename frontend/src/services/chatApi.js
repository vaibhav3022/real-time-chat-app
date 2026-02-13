
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/task5/api`;
console.log("API BASE URL:", import.meta.env.VITE_API_BASE_URL);

/**
 * Get auth token from localStorage
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem("chatToken");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

/**
 * Authentication APIs
 */
export const authApi = {
  signup: async (name, email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return await response.json();
  },

  googleLogin: async (name, email, profilePicture) => {
    const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, profilePicture }),
    });
    return await response.json();
  },

  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return await response.json();
  },

  getMe: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  },
};

/**
 * User APIs
 */
export const userApi = {
  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  },

  searchUsers: async (query) => {
    const response = await fetch(`${API_BASE_URL}/users/search?query=${query}`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  },

  getUserById: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  },

  getConversations: async () => {
    const response = await fetch(`${API_BASE_URL}/users/conversations/list`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  },
};

/**
 * Chat APIs
 */
export const chatApi = {
  sendMessage: async (receiverId, message, messageType = "text") => {
    const response = await fetch(`${API_BASE_URL}/chats/send`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ receiverId, message, messageType }),
    });
    return await response.json();
  },

  getMessages: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/chats/${userId}`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  },

  updateMessageStatus: async (messageId, status) => {
    const response = await fetch(`${API_BASE_URL}/chats/${messageId}/status`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return await response.json();
  },

  markMessagesAsRead: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/chats/mark-read/${userId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return await response.json();
  },

  deleteMessage: async (messageId) => {
    const response = await fetch(`${API_BASE_URL}/chats/${messageId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await response.json();
  },

  getUnreadCount: async () => {
    const response = await fetch(`${API_BASE_URL}/chats/unread/count`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  },
};