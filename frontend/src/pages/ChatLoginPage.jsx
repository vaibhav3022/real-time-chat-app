import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/chatApi";
import { MessageCircle, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react";

const ChatLoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // ✅ FIXED: Redirect if already logged in (prevents URL manipulation)
  useEffect(() => {
    const token = localStorage.getItem("chatToken");
    const user = localStorage.getItem("chatUser");
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        if (userData.id && userData.name && userData.email) {
          console.log("🔒 Already authenticated, redirecting to chat...");
          // Use replace to prevent back button from returning to login
          navigate("/chatbot2", { replace: true });
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        // If data is corrupted, clear it
        localStorage.removeItem("chatToken");
        localStorage.removeItem("chatUser");
      }
    }
  }, [navigate]);

  // ✅ Check authentication on mount and visibility change
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("chatToken");
      const user = localStorage.getItem("chatUser");
      
      if (token && user) {
        try {
          const userData = JSON.parse(user);
          if (userData.id) {
            navigate("/chatbot2", { replace: true });
          }
        } catch (error) {
          console.error("Auth check error:", error);
        }
      }
    };

    // Check when page becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', checkAuth);
    
    return () => {
      document.removeEventListener('visibilitychange', checkAuth);
    };
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let response;
      
      if (isLogin) {
        response = await authApi.login(formData.email, formData.password);
      } else {
        response = await authApi.signup(formData.name, formData.email, formData.password);
      }

      if (response.success) {
        if (isLogin) {
          // Login - save token and navigate to chat
          localStorage.setItem("chatToken", response.token);
          localStorage.setItem("chatUser", JSON.stringify(response.user));
          
          // Clear any old chat cache
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('chat_') && !key.includes('sound')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          console.log("✅ Login successful, redirecting...");
          
          // Use replace to prevent back button
          navigate("/chatbot2", { replace: true });
        } else {
          // Signup - just show success and switch to login
          setIsLogin(true);
          setError("");
          setFormData({ name: "", email: formData.email, password: "" });
          // Show success message
          alert("Account created successfully! Please login.");
        }
      } else {
        setError(response.message || "Authentication failed");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle back button click
  const handleBackClick = () => {
    // Clear any partial login data
    const token = localStorage.getItem("chatToken");
    if (!token) {
      // Only navigate back if not logged in
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 relative">
      {/* Back Button - Only show if not logged in */}
      <button
        onClick={handleBackClick}
        className="absolute top-6 left-6 flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <MessageCircle className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">ChatFlow</h1>
          <p className="text-white/80">Connect with friends instantly</p>
        </div>

        {/* Login/Signup Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {isLogin ? "Welcome Back!" : "Create Account"}
            </h2>
            <p className="text-gray-500 mt-1">
              {isLogin ? "Login to continue chatting" : "Sign up to start chatting"}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (only for signup) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                isLogin ? "Login" : "Sign Up"
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setFormData({ name: "", email: "", password: "" });
                }}
                className="text-purple-600 font-semibold hover:underline"
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </p>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secure Login</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Encrypted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-white/70 text-sm">
          <p>© 2024 ChatFlow. All rights reserved.</p>
          <p className="mt-2">
            By logging in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatLoginPage;