import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getEnvVar, hasFirebaseConfig, getConfigStatus } from '../utils/env';

// Check if Firebase configuration is available
const configStatus = getConfigStatus();
const hasConfig = hasFirebaseConfig();

// Default/fallback Firebase configuration for build-time
const defaultFirebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:demo123456789',
};

let firebaseConfig = defaultFirebaseConfig;

// Use runtime configuration if available
if (hasConfig) {
  firebaseConfig = {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || defaultFirebaseConfig.apiKey,
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || defaultFirebaseConfig.authDomain,
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || defaultFirebaseConfig.projectId,
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || defaultFirebaseConfig.storageBucket,
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || defaultFirebaseConfig.messagingSenderId,
    appId: getEnvVar('VITE_FIREBASE_APP_ID') || defaultFirebaseConfig.appId,
  };
  console.log('✅ Firebase initialized with runtime configuration');
} else {
  console.warn('⚠️ Firebase configuration incomplete');
  console.warn(`🔧 Missing ${configStatus.missingVarsCount} required environment variables`);
  console.warn('🔧 Application will run in degraded mode without Firebase features');
  console.warn('🔧 Required variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID');
  console.warn('🔧 Using fallback configuration for build compatibility');
}

// Initialize Firebase (always succeeds with fallback config)
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

// Export configuration status
export { hasConfig as isFirebaseConfigured, configStatus };

// Helper function to check if Firebase is available before using
export const requireFirebase = () => {
  if (!hasConfig) {
    throw new Error('Firebase not configured. Please check your environment variables.');
  }
};
