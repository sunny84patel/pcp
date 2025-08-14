
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// 🔑 Replace this config with yours from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCAICdKXk7ARRM_2UdNYm3m49SNaZzufYs",
  authDomain: "price-pcp.firebaseapp.com",
  projectId: "price-pcp",
  storageBucket: "price-pcp.firebasestorage.app",
  messagingSenderId: "834253883813",
  appId: "1:834253883813:web:a7fa0ec6edd94cf933004c",
  measurementId: "G-N9W7JBKKX6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
