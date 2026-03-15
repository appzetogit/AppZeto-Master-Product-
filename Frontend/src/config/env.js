export const ENV = {
  NODE_ENV: import.meta.env.MODE,
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  // Add other env vars here
};
