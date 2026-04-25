import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseAdmin = null;

export const initializeFirebase = () => {
  try {
    // ROBUSTNESS: Rely on system time. Global Date.now overrides cause significant logical issues elsewhere.

    let serviceAccount;

    if (process.env.FIREBASE_PRIVATE_KEY) {
      // Preference: Environment Variables
      serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
    } else {
      // Fallback: serviceAccountKey.json file
      const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
      if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
      } else {
        throw new Error('Firebase credentials missing (neither .env nor serviceAccountKey.json found)');
      }
    }

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key
        })
      });
      console.log('✓ Firebase Admin initialized with time-drift compensation (%s)', serviceAccount.project_id);
    } else {
      firebaseAdmin = admin.app();
    }

    return firebaseAdmin;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
    return null;
  }
};

// Get Firebase Admin instance
export const getFirebaseAdmin = () => {
  if (!firebaseAdmin) {
    initializeFirebase();
  }
  return firebaseAdmin;
};

export { admin };
