import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { isWebView } from './deviceDetect';

const sanitizeEnv = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

// Firebase configuration
const firebaseConfig = {
  apiKey: sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: sanitizeEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: sanitizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: sanitizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID)
};

const VAPID_KEY = sanitizeEnv(import.meta.env.VITE_FIREBASE_VAPID_KEY);
const HAS_FIREBASE_WEB_CONFIG = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

const app = HAS_FIREBASE_WEB_CONFIG ? initializeApp(firebaseConfig) : null;

let messaging = null;

const getMessagingInstance = () => {
  if (!HAS_FIREBASE_WEB_CONFIG || !app) {
    return null;
  }

  // Firebase Web Messaging requires serviceWorker support.
  // Flutter WebViews do NOT support service workers, so skip in that context.
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !isWebView()) {
    if (!messaging) {
      try {
        messaging = getMessaging(app);
      } catch (error) {
        console.error('[Firebase] Failed to initialize Firebase Messaging:', error);
      }
    }
    return messaging;
  }
  return null;
};

/**
 * Request notification permission and get the web FCM token.
 * ONLY works in a real browser — NOT in Flutter WebView (WebViews don't support
 * the Push API / service workers needed for web push).
 *
 * For Flutter WebView users, FCM tokens are registered directly by the Flutter
 * native code hitting /api/v1/users/fcm-token or /api/v1/partners/fcm-token with platform='app'.
 */
export const requestNotificationPermission = async () => {
  try {
    // Skip completely if running inside a Flutter WebView
    if (isWebView()) {
      console.log('[FCM] Running in Flutter WebView — skipping web push registration (handled natively by Flutter).');
      return null;
    }

    if (!('Notification' in window)) {
      console.warn('[FCM] This browser does not support notifications.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied.');
      return null;
    }

    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) {
      console.warn('[FCM] Could not get messaging instance (missing Firebase config, WebView, or incompatible browser).');
      return null;
    }

    if (!VAPID_KEY) {
      console.warn('[FCM] Missing VITE_FIREBASE_VAPID_KEY. Skipping web push registration.');
      return null;
    }

    try {
      const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
      if (token) {
        console.log('[FCM] Web push token obtained.');
        return token;
      } else {
        console.warn('[FCM] No FCM token received — service worker may not be registered.');
        return null;
      }
    } catch (error) {
      console.error('[FCM] Error getting FCM token:', error);
      return null;
    }
  } catch (error) {
    console.error('[FCM] Error requesting permission:', error);
    return null;
  }
};

/**
 * Listen for foreground messages (browser tab is open and in focus).
 * Only active in real browser — not in Flutter WebView.
 * In Flutter WebView, the native Flutter code handles FCM messages.
 */
export const onMessageListener = (callback) => {
  // Skip in WebView — Flutter native handles foreground messages there
  if (isWebView()) return;

  const messagingInstance = getMessagingInstance();
  if (messagingInstance) {
    onMessage(messagingInstance, (payload) => {
      if (callback) callback(payload);
    });
  }
};

export default app;
