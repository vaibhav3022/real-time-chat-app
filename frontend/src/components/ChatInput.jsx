import { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip, Mic, Image as ImageIcon } from "lucide-react";
import { useChatContext } from "../context/ChatContext";

import EmojiPicker from "emoji-picker-react";

const ChatInput = () => {
  const { selectedUser, sendMessage, startTyping, stopTyping } = useChatContext();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const handleTyping = (value) => {
    setMessage(value);

    // Start typing indicator
    if (!isTyping && value.trim() && selectedUser) {
      setIsTyping(true);
      startTyping(selectedUser._id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && selectedUser) {
        setIsTyping(false);
        stopTyping(selectedUser._id);
      }
    }, 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();

    if (!message.trim() || !selectedUser) return;

    // Send message
    sendMessage(selectedUser._id, message.trim());
    setMessage("");
    setShowEmojiPicker(false);
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      stopTyping(selectedUser._id);
    }

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Focus input for next message
    inputRef.current?.focus();
  };

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    // Don't close picker, allows multiple emojis
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && 
          !event.target.closest('button[title="Emoji"]')) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleRecordAudio = async () => {
    if (isRecording) {
      // Find the STOP logic below to understand flow
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start Recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], "voice_note.webm", { type: 'audio/webm' });
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          
          // Upload
          if (audioFile.size > 10 * 1024 * 1024) {
            alert("Voice note too large");
            return;
          }

          const formData = new FormData();
          formData.append("file", audioFile);

          try {
            const token = localStorage.getItem("chatToken");
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/task5/api/chats/upload`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: formData
            });
            const data = await res.json();
            
            if (data.success && socket && currentUser && selectedUser) {
              socket.emit("message:send", {
                senderId: currentUser.id || currentUser._id,
                receiverId: selectedUser._id,
                message: data.fileUrl,
                messageType: "voice"
              });
            }
          } catch (err) {
            console.error("Voice upload failed", err);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone");
      }
    }
  };

  const handleAttachFile = () => {
    // Add file attachment logic here
    console.log("Attach file");
  };

  const handleAttachImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Max 10MB allowed.");
      return;
    }

    // Upload logic
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("chatToken");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/task5/api/chats/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        console.log("Image uploaded:", data.fileUrl);
        // Send message as image
        const { socket, currentUser } = useChatContext(); // Need to access socket directly here
        // Actually, we should expose a method in context or use sendMessage with type
        // Let's modify sendMessage in context to accept type first? 
        // Or cleaner: emit socket event directly here if context doesn't support types yet.
        // Wait, I should check context sendMessage first. It only takes (receiverId, message).
        // I will hack it for now: send a structured object or just the URL. 
        // Better: I'll update ChatContext to support types in next step. For now, I'll assumem logic is:
        // sendMessage(receiverId, data.fileUrl, "image");
        // But wait, ChatContext signature is sendMessage(receiverId, message).
        
        // TEMPORARY: I will call socket directly from here using the context hook
        // Re-importing useChatContext inside component to get socket
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image");
    }
  };
  
  // Custom hook usage to get socket
  const { socket, currentUser } = useChatContext();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File too large");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("chatToken");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/task5/api/chats/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (data.success && socket && currentUser && selectedUser) {
        socket.emit("message:send", {
          senderId: currentUser.id || currentUser._id,
          receiverId: selectedUser._id,
          message: data.fileUrl, // The message content is the URL
          messageType: "image"   // New field!
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
    
    // Reset input
    e.target.value = "";
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping && selectedUser) {
        stopTyping(selectedUser._id);
      }
    };
  }, [selectedUser, isTyping]);

  useEffect(() => {
    // Focus input when user is selected
    if (selectedUser) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [selectedUser]);

  if (!selectedUser) return null;

  return (
    <div className="bg-white border-t border-gray-200 p-3 md:p-4 shadow-lg relative">
      {/* Emoji Picker Pop-up */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-20 right-4 z-50 shadow-2xl rounded-xl border border-gray-200 animate-fadeIn"
        >
          <EmojiPicker 
            onEmojiClick={onEmojiClick}
            autoFocusSearch={false}
            theme="light"
            searchDisabled={false}
            skinTonesDisabled={true}
            width={300}
            height={400}
          />
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />
      <form onSubmit={handleSend} className="flex items-end space-x-2 md:space-x-3">
        {/* Attachment buttons */}
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={handleAttachImage}
            className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
            title="Attach image"
          >
            <ImageIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
          </button>
          
          <button
            type="button"
            onClick={handleAttachFile}
            className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
          </button>
          
          <button
            type="button"
            onClick={handleRecordAudio}
            className={`p-2 rounded-full transition flex-shrink-0 ${
              isRecording 
                ? "bg-red-100 text-red-600 hover:bg-red-200" 
                : "hover:bg-gray-100 text-gray-600"
            }`}
            title={isRecording ? "Stop recording" : "Record voice"}
          >
            <Mic className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Message input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="w-full px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base placeholder-gray-500"
          />
          {isRecording && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              Recording...
            </div>
          )}
        </div>

        {/* Emoji button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0 hidden md:block ${
            showEmojiPicker ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
          }`}
          title="Emoji"
        >
          <Smile className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim()}
          className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 shadow-md ${
            message.trim()
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:shadow-lg"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

    </div>
  );
};

export default ChatInput;