import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with forced long polling and disabled streams for maximum reliability
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false 
} as any, databaseId);

// Add diagnostic logging for database targeting
console.log('Firebase 正在访问的数据库 ID:', (db as any)._databaseId.database);

export const auth = getAuth(app);
