import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

// Check for missing required config
const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value && key !== 'databaseId')
  .map(([key]) => key);

if (missingKeys.length > 0 && import.meta.env.PROD) {
  console.warn('Firebase configuration is incomplete. Missing keys:', missingKeys.join(', '));
  console.info('Make sure all VITE_FIREBASE_* environment variables are set during build time.');
} else if (import.meta.env.PROD) {
  console.log('Firebase initialized with Project ID:', firebaseConfig.projectId, 'Database ID:', databaseId);
}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings for better reliability (long polling)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);

export const auth = getAuth(app);
