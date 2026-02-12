import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const ChatProtectedRoute = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const backAttemptCount = useRef(0);
  const isBlockingRef = useRef(false);
  const cleanupFunctionsRef = useRef([]);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("chatToken");
    const user = localStorage.getItem("chatUser");
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        if (userData.id && userData.name && userData.email) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // ✅ COMPREHENSIVE NAVIGATION BLOCKING - Works immediately after login
  useEffect(() => {
    if (isAuthenticated && location.pathname.includes('/chatbot2') && 
        !location.pathname.includes('/chatbot2/login')) {
      
      console.log("🔒 Chat protection activated IMMEDIATELY");
      isBlockingRef.current = true;
      
      // Store original methods
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;
      
      // Add chat page to history stack
      const addChatToHistory = () => {
        originalPushState.call(
          window.history, 
          { isChatPage: true, protected: true, timestamp: Date.now() }, 
          "", 
          "/chatbot2"
        );
      };
      
      // Add multiple entries immediately (no delay)
      addChatToHistory();
      addChatToHistory();
      addChatToHistory();
      
      // ✅ 1. Override history.pushState
      window.history.pushState = function(state, title, url) {
        if (url && !url.toString().includes('/chatbot2') && isBlockingRef.current) {
          console.log("🚫 BLOCKED pushState to:", url);
          setShowLogoutModal(true);
          addChatToHistory();
          return;
        }
        return originalPushState.apply(window.history, [state, title, url]);
      };
      
      // ✅ 2. Override history.replaceState
      window.history.replaceState = function(state, title, url) {
        if (url && !url.toString().includes('/chatbot2') && isBlockingRef.current) {
          console.log("🚫 BLOCKED replaceState to:", url);
          setShowLogoutModal(true);
          addChatToHistory();
          return;
        }
        return originalReplaceState.apply(window.history, [state, title, url]);
      };
      
      // ✅ 3. Block popstate (back/forward buttons)
      const handlePopState = (event) => {
        if (isBlockingRef.current) {
          backAttemptCount.current += 1;
          event.preventDefault();
          event.stopImmediatePropagation();
          
          console.log("🚫 BACK BUTTON BLOCKED, attempt:", backAttemptCount.current);
          
          if (backAttemptCount.current === 1) {
            setShowLogoutModal(true);
          }
          
          // Immediately restore chat page
          addChatToHistory();
        }
      };
      
      // ✅ 4. Block beforeunload (tab close)
      const handleBeforeUnload = (event) => {
        if (isBlockingRef.current) {
          event.preventDefault();
          event.returnValue = "Please logout properly before leaving!";
          return "Please logout properly before leaving!";
        }
      };
      
      // ✅ 5. Intercept ALL link clicks
      const handleClick = (e) => {
        if (!isBlockingRef.current) return;
        
        const link = e.target.closest('a');
        if (link && link.href && link.href !== '#') {
          try {
            const url = new URL(link.href, window.location.origin);
            
            // Block same-origin non-chat links
            if (url.origin === window.location.origin && !url.pathname.includes('/chatbot2')) {
              e.preventDefault();
              e.stopImmediatePropagation();
              console.log("🚫 BLOCKED link click to:", url.pathname);
              setShowLogoutModal(true);
              return false;
            }
            
            // Warn on external links
            if (url.origin !== window.location.origin) {
              e.preventDefault();
              e.stopImmediatePropagation();
              if (window.confirm("Leaving ChatFlow will logout. Continue?")) {
                handleLogout();
              }
              return false;
            }
          } catch (error) {
            console.log("URL parse error:", error);
          }
        }
      };
      
      // ✅ 6. Monitor URL changes aggressively
      let lastPathname = window.location.pathname;
      const checkUrlInterval = setInterval(() => {
        const currentPath = window.location.pathname;
        
        if (currentPath !== lastPathname) {
          console.log("🔍 URL changed:", lastPathname, "→", currentPath);
          
          if (!currentPath.includes('/chatbot2') && isBlockingRef.current) {
            console.log("🚫 UNAUTHORIZED URL CHANGE DETECTED!");
            
            // Force restore chat page
            originalReplaceState.call(
              window.history,
              { isChatPage: true, protected: true },
              "",
              "/chatbot2"
            );
            
            setShowLogoutModal(true);
          }
          
          lastPathname = currentPath;
        }
      }, 25); // Check every 25ms for instant detection
      
      // ✅ 7. Block hashchange
      const handleHashChange = (e) => {
        if (isBlockingRef.current) {
          e.preventDefault();
          console.log("🚫 BLOCKED hash change");
          addChatToHistory();
        }
      };
      
      // Add all event listeners with capture phase
      window.addEventListener('popstate', handlePopState, true);
      window.addEventListener('beforeunload', handleBeforeUnload, true);
      window.addEventListener('hashchange', handleHashChange, true);
      document.addEventListener('click', handleClick, true);
      
      console.log("✅ ALL NAVIGATION BLOCKS ACTIVATED");
      
      // Store cleanup functions
      cleanupFunctionsRef.current = [
        () => window.removeEventListener('popstate', handlePopState, true),
        () => window.removeEventListener('beforeunload', handleBeforeUnload, true),
        () => window.removeEventListener('hashchange', handleHashChange, true),
        () => document.removeEventListener('click', handleClick, true),
        () => clearInterval(checkUrlInterval),
        () => { window.history.pushState = originalPushState; },
        () => { window.history.replaceState = originalReplaceState; }
      ];
      
      // Cleanup function
      return () => {
        console.log("🧹 Cleaning up navigation blocks");
        
        isBlockingRef.current = false;
        backAttemptCount.current = 0;
        
        cleanupFunctionsRef.current.forEach(cleanup => cleanup());
        cleanupFunctionsRef.current = [];
      };
    }
  }, [isAuthenticated, location.pathname]);

  // Handle logout
  const handleLogout = () => {
    console.log("🚪 Logging out...");
    
    // Disable blocking FIRST
    isBlockingRef.current = false;
    backAttemptCount.current = 0;
    
    // Run all cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => cleanup());
    cleanupFunctionsRef.current = [];
    
    // Clear all chat data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.getItem(i);
      if (key && (key.startsWith('chat_') || key === 'chatToken' || key === 'chatUser')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setShowLogoutModal(false);
    
    // Navigate to login
    setTimeout(() => {
      window.location.href = "/chatbot2/login";
    }, 100);
  };

  const handleStayInChat = () => {
    console.log("✅ Staying in chat");
    setShowLogoutModal(false);
    backAttemptCount.current = 0;
    
    // Ensure we're on chat page
    if (!window.location.pathname.includes('/chatbot2')) {
      window.history.replaceState({ isChatPage: true }, "", "/chatbot2");
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Securing your chat...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/chatbot2/login" replace state={{ from: location }} />;
  }

  return (
    <>
      {children}
      
      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={(e) => e.target === e.currentTarget && handleStayInChat()}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-red-500">
            <div className="bg-gradient-to-r from-red-600 to-orange-500 p-6 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">🔒 Navigation Blocked</h3>
                  <p className="text-white/90 text-sm">Security protection active</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium mb-2">
                  ⚠️ You cannot leave chat using:
                </p>
                <ul className="text-sm text-amber-700 space-y-1 ml-4">
                  <li>• Back button</li>
                  <li>• URL changes</li>
                  <li>• Browser navigation</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <p className="text-sm text-green-800 font-medium mb-2">
                  ✅ To exit properly:
                </p>
                <ol className="text-sm text-green-700 space-y-1 ml-4">
                  <li>1. Click <strong>Logout button</strong> (top-right)</li>
                  <li>2. Confirm logout</li>
                  <li>3. You'll be redirected safely</li>
                </ol>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleStayInChat}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                >
                  OK, Continue Chatting
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-all"
                >
                  Logout Now
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-3 border-t">
              <p className="text-xs text-gray-500 text-center">
                ChatFlow Security • Protection Active
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatProtectedRoute;