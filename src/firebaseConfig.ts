import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration using Vite environment variables or fallback values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY_FALLBACK",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN_FALLBACK",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID_FALLBACK",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET_FALLBACK",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID_FALLBACK",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID_FALLBACK"
};

// Check if credentials are placeholders
const isPlaceholder = !import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId.includes("FALLBACK");

if (isPlaceholder && typeof window !== 'undefined') {
  console.warn(
    "Firebase is using fallback credentials. Please configure your .env file with VITE_FIREBASE_* environment variables."
  );
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db, isPlaceholder };
