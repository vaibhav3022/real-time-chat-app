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
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login" element={<ChatLoginPage />} />

        <Route
          path="/chatapp"
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
