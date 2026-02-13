// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAG89OCQMa1S9roIAJrK-fBQKVdA4z4PFA",
    authDomain: "real-time-chat-app-185a3.firebaseapp.com",
    projectId: "real-time-chat-app-185a3",
    storageBucket: "real-time-chat-app-185a3.firebasestorage.app",
    messagingSenderId: "689279839818",
    appId: "1:689279839818:web:91015c028f0f5c777d00b3",
    measurementId: "G-7YP6FYB3VK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
