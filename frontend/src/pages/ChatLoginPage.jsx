import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/chatApi";
import { MessageCircle, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

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

  /* ================= GOOGLE LOGIN ================= */
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const response = await authApi.googleLogin(
        user.displayName,
        user.email,
        user.photoURL
      );

      if (response.success) {
        localStorage.setItem("chatToken", response.token);
        localStorage.setItem("chatUser", JSON.stringify(response.user));

        clearChatCache();
        navigate("/chatapp", { replace: true });
      } else {
        setError(response.message || "Google authentication failed");
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError("Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const token = localStorage.getItem("chatToken");
    const user = localStorage.getItem("chatUser");

    if (token && user) {
      try {
        const userData = JSON.parse(user);
        if (userData.id) {
          navigate("/chatapp", { replace: true });
        }
      } catch {
        localStorage.removeItem("chatToken");
        localStorage.removeItem("chatUser");
      }
    }
  }, [navigate]);

  /* ================= FORM CHANGE ================= */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let response;

      if (isLogin) {
        response = await authApi.login(formData.email, formData.password);
      } else {
        response = await authApi.signup(
          formData.name,
          formData.email,
          formData.password
        );
      }

      if (response.success) {
        if (isLogin) {
          localStorage.setItem("chatToken", response.token);
          localStorage.setItem("chatUser", JSON.stringify(response.user));
          clearChatCache();
          navigate("/chatapp", { replace: true });
        } else {
          alert("Account created successfully! Please login.");
          setIsLogin(true);
        }
      } else {
        setError(response.message || "Authentication failed");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= CLEAR CACHE ================= */
  const clearChatCache = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("chat_") && !key.includes("sound")) {
        localStorage.removeItem(key);
      }
    });
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 py-12 px-4 relative overflow-y-auto custom-scrollbar">

  

      <div className="w-full max-w-md py-8">

       

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-10 mb-8 w-full border border-white/20 relative overflow-hidden group">
          {/* Subtle light effect */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700"></div>

          <h2 className="text-3xl font-black text-center text-gray-900 mb-2">
            {isLogin ? "Welcome Back!" : "Create Account"}
          </h2>

          <p className="text-center text-gray-500 mb-8 font-medium">
            {isLogin ? "Login to continue chatting" : "Sign up to start chatting"}
          </p>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-3 animate-shake">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {!isLogin && (
              <div className="relative group">
                <User className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  required
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all hover:border-purple-300 bg-gray-50/50 focus:bg-white"
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                required
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all hover:border-purple-300 bg-gray-50/50 focus:bg-white"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
                minLength={6}
                className="w-full pl-12 pr-14 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all hover:border-purple-300 bg-gray-50/50 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-gray-400 hover:text-purple-500 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                isLogin ? "Login Now" : "Create Account"
              )}
            </button>

            <div className="text-center text-sm font-medium text-gray-600 pt-2">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setFormData({ name: "", email: "", password: "" });
                }}
                className="ml-2 text-purple-600 font-bold hover:text-purple-700 underline-offset-4 hover:underline transition-all"
              >
                {isLogin ? "Sign Up Free" : "Login Here"}
              </button>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                <span className="px-3 bg-white text-gray-400">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-4 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.16l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-white/70 text-sm font-medium">
          <p>© 2026 ChatFlow. Secure, Fast, and Reliable.</p>
        </div>

      </div>
    </div>
  );
};

export default ChatLoginPage;
