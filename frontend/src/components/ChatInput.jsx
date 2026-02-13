import { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip, Mic, Image as ImageIcon, X } from "lucide-react";
import { useChatContext } from "../context/ChatContext";
import EmojiPicker from "emoji-picker-react";

const ChatInput = () => {
  const { selectedUser, sendMessage, startTyping, stopTyping, socket, currentUser } = useChatContext();
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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    inputRef.current?.focus();
  };

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
  };

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
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
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
          
          stream.getTracks().forEach(track => track.stop());
          
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

  const handleAttachImage = () => {
    fileInputRef.current?.click();
  };

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
          message: data.fileUrl,
          messageType: "image"
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
    
    e.target.value = "";
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTyping && selectedUser) stopTyping(selectedUser._id);
    };
  }, [selectedUser, isTyping]);

  useEffect(() => {
    if (selectedUser) setTimeout(() => inputRef.current?.focus(), 100);
  }, [selectedUser]);

  if (!selectedUser) return null;

  return (
    <div className="relative animate-slide-up">
      {/* Emoji Picker Pop-up */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-20 right-0 z-50 shadow-2xl rounded-2xl border border-gray-100 animate-scale-in"
        >
          <EmojiPicker 
            onEmojiClick={onEmojiClick}
            autoFocusSearch={false}
            theme="light"
            searchDisabled={false}
            skinTonesDisabled={true}
            width={320}
            height={400}
            previewConfig={{ showPreview: false }}
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
      
      <form onSubmit={handleSend} className="flex items-end space-x-2 bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-gray-100 p-2 md:p-2.5 hover:shadow-md transition-shadow">
        
        {/* Attachment buttons group */}
        <div className="flex items-center space-x-1 pl-1">
            <button
                type="button"
                onClick={handleAttachImage}
                className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors"
                title="Attach image"
            >
                <ImageIcon className="w-5 h-5 md:w-5.5 md:h-5.5" />
            </button>
            
            <button
                type="button"
                onClick={handleRecordAudio}
                className={`p-2.5 rounded-full transition-all duration-300 relative ${
                isRecording 
                    ? "bg-red-50 text-red-500 ring-2 ring-red-100 animate-pulse" 
                    : "hover:bg-gray-100 text-gray-500 hover:text-indigo-600"
                }`}
                title={isRecording ? "Stop recording" : "Record voice"}
            >
                <div className={`absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping ${isRecording ? 'block' : 'hidden'}`}></div>
                <Mic className="w-5 h-5 md:w-5.5 md:h-5.5 relative z-10" />
            </button>
        </div>

        {/* Message input */}
        <div className="flex-1 min-w-0 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isRecording ? "Recording audio..." : "Type a message..."}
            disabled={isRecording}
            className="w-full px-3 py-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm md:text-[15px] placeholder-gray-400 text-gray-700"
          />
        </div>

        {/* Emoji & Send Actions */}
        <div className="flex items-center space-x-1 pr-1">
             <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2.5 rounded-full hover:bg-gray-100 transition-colors hidden md:block ${
                    showEmojiPicker ? 'text-indigo-500 bg-indigo-50' : 'text-gray-400 hover:text-indigo-500'
                }`}
                title="Emoji"
            >
                <Smile className="w-5 h-5 md:w-5.5 md:h-5.5" />
            </button>

            <button
                type="submit"
                disabled={!message.trim()}
                className={`p-3 rounded-full transition-all duration-300 transform shadow-md flex items-center justify-center ${
                    message.trim()
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105 active:scale-95 translate-x-0 opacity-100"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed scale-90"
                }`}
                title="Send message"
            >
                <Send className="w-5 h-5 ml-0.5" />
            </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;