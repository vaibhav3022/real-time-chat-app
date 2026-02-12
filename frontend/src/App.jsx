import './App.css'
import ChatLoginPage from "./pages/ChatLoginPage";
import ChatHomePage from "./pages/ChatHomePage";
import ChatProtectedRoute from "./components/ChatProtectedRoute";
import { Routes, Route, Navigate } from 'react-router-dom';
import { TaskProvider } from "./context/TaskContext";

function App() {
  return (
    <TaskProvider>
      <Routes>

        {/* Default route redirect */}
        <Route path="/" element={<Navigate to="/chatbot2/login" />} />

        <Route path="/chatbot2/login" element={<ChatLoginPage />} />

        <Route
          path="/chatbot2"
          element={
            <ChatProtectedRoute>
              <ChatHomePage />
            </ChatProtectedRoute>
          }
        />

      </Routes>
    </TaskProvider>
  );
}

export default App;
