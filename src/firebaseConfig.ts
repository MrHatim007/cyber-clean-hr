import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration using user-supplied production credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCnrpsxAeA06UDRjCjf8PNNV485LFJOxlI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "anwar-971a1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "anwar-971a1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "anwar-971a1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "567972576600",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:567972576600:web:fa4c814530fa3696fab92d"
};

// If credentials are the placeholder fallback keys (no longer placeholder, real keys are hardcoded above)
const isPlaceholder = firebaseConfig.projectId.includes("YOUR_PROJECT_ID_FALLBACK");

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db, isPlaceholder };
