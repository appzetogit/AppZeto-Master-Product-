import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || ""
};

// Validate Firebase configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId', 'messagingSenderId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field] || firebaseConfig[field] === 'undefined');

if (missingFields.length > 0) {
  console.error('Firebase configuration is missing required fields:', missingFields);
  console.error('Current config:', firebaseConfig);
  console.error('Environment variables:', {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  });
  throw new Error(`Firebase configuration error: Missing fields: ${missingFields.join(', ')}. Please check your .env file and restart the dev server.`);
}

// Initialize Firebase app only once
let app;
let firebaseAuth;
let googleProvider;
let firebaseRealtimeDb;

// Function to ensure Firebase is initialized.
// By default we initialize Auth too (existing pages expect it),
// but order-tracking/realtime usage can disable auth to avoid
// identitytoolkit calls on pages that don't need Auth.
function ensureFirebaseInitialized(options = {}) {
  const { enableAuth = true, enableGoogleProvider = true, enableRealtimeDb = true } = options;
  try {
    const existingApps = getApps();
    if (existingApps.length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully with config:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 20) + '...' : 'missing'
      });
    } else {
      app = existingApps[0];
      console.log('Firebase app already initialized, reusing existing instance');
    }

    // Initialize Auth only when required (prevents identitytoolkit calls on
    // pages that only need realtime database, e.g. order tracking).
    if (enableAuth) {
      if (!firebaseAuth) {
        firebaseAuth = getAuth(app);
        if (!firebaseAuth) {
          throw new Error('Failed to get Firebase Auth instance');
        }
        console.log('Firebase Auth initialized successfully', {
          appName: app?.name,
          authAppName: firebaseAuth?.app?.name
        });
      }

      // Initialize Google Provider only if needed
      if (enableGoogleProvider && !googleProvider) {
        googleProvider = new GoogleAuthProvider();
        // Scopes (email, profile) are usually default, removing explicit calls to avoid "not a function" error
        console.log('Google Auth Provider initialized');
      }
    }

    if (enableRealtimeDb && !firebaseRealtimeDb) {
      firebaseRealtimeDb = getDatabase(app);
    }

    if (!firebaseRealtimeDb) {
      firebaseRealtimeDb = firebaseConfig.databaseURL
        ? getDatabase(app, firebaseConfig.databaseURL)
        : getDatabase(app);
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    console.error('Firebase config used:', firebaseConfig);
    throw error;
  }
}

export const firebaseApp = app;
export { firebaseAuth, googleProvider, firebaseRealtimeDb, ensureFirebaseInitialized };


