import { useEffect } from "react";

const NotificationSound = () => {
  useEffect(() => {
    const playSound = (event) => {
      if (event.detail && event.detail.playSound) {
        try {
          // Create audio context for better sound control
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          
        } catch (error) {
          console.log("Audio context not supported, using fallback");
          // Fallback to simple audio
          const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ');
          audio.volume = 0.2;
          audio.play().catch(e => console.log("Audio play failed"));
        }
      }
    };
    
    window.addEventListener('newMessageNotification', playSound);
    
    return () => {
      window.removeEventListener('newMessageNotification', playSound);
    };
  }, []);
  
  return null;
};

export default NotificationSound;