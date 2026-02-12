import { ChatProvider } from "../context/ChatContext";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { useState } from "react";


const ChatHomePage = () => {
  const [showChat, setShowChat] = useState(false);

  return (
   <ChatProvider>
      <div className="h-screen w-full flex overflow-hidden bg-gray-100">
        {/* Sidebar - Mobile: show only when chat is not open, Desktop: always show */}
        <div className={`${showChat ? 'hidden' : 'flex'} md:flex w-full md:w-80 lg:w-96 h-full`}>
          <Sidebar onSelectChat={() => setShowChat(true)} />
        </div>
        
        {/* Chat Window - Mobile: show only when chat is open, Desktop: always show */}
        <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-1 h-full`}>
          <ChatWindow onBack={() => setShowChat(false)} />
        </div>
      </div>
    </ChatProvider>
  );
};

export default ChatHomePage;