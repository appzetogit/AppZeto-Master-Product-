import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export auth helper functions
export const authAPI = {
  // Send OTP (supports both phone and email)
  sendOTP: (phone = null, purpose = "login", email = null) => {
    const payload = { purpose };
    if (phone) payload.phone = phone;
    if (email) payload.email = email;
    return apiClient.post(API_ENDPOINTS.AUTH.SEND_OTP, payload);
  },

  // Verify OTP (supports both phone and email)
  // 'password' is used only for email/password registrations (e.g. admin signup)
  verifyOTP: (
    phone = null,
    otp,
    purpose = "login",
    name = null,
    email = null,
    role = "user",
    password = null,
    referralCode = null,
  ) => {
    const payload = {
      otp,
      purpose,
      role,
    };
    if (phone != null) payload.phone = phone;
    if (email != null) payload.email = email;
    if (name != null) payload.name = name;
    if (password != null) payload.password = password; // don't send null, Joi expects string
    if (referralCode != null && String(referralCode).trim()) {
      payload.referralCode = String(referralCode).trim().toUpperCase();
    }
    return apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, payload);
  },

  // Register with email/password
  register: (
    name,
    email,
    password,
    phone = null,
    role = "user",
    referralCode = null,
  ) => {
    return apiClient.post(API_ENDPOINTS.AUTH.REGISTER, {
      name,
      email,
      password,
      phone,
      role,
      ...(referralCode ? { referralCode: String(referralCode).trim().toUpperCase() } : {}),
    });
  },

  // Login with email/password
  login: (email, password, role = "user") => {
    const payload = { email, password, role };
    return apiClient.post(API_ENDPOINTS.AUTH.LOGIN, payload);
  },

  // Login/Register via Firebase Google ID token
  firebaseGoogleLogin: (idToken, role = "restaurant", referralCode = null) => {
    return apiClient.post(API_ENDPOINTS.AUTH.FIREBASE_GOOGLE_LOGIN, {
      idToken,
      role,
      ...(referralCode ? { referralCode: String(referralCode).trim().toUpperCase() } : {}),
    });
  },

  // Save FCM token for authenticated role (user/restaurant/delivery via /auth/login)
  saveFcmToken: (token, platform = "web") => {
    return apiClient.post("/auth/fcm-token", { token, platform });
  },

  // Remove FCM token
  removeFcmToken: (payload = {}) => {
    return apiClient.delete("/auth/fcm-token", { data: payload });
  },

  // Refresh token
  refreshToken: () => {
    return apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN);
  },

  // Logout
  logout: () => {
    return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  // Get current user
  getCurrentUser: () => {
    return apiClient.get(API_ENDPOINTS.AUTH.ME);
  },
};

export default authAPI;
