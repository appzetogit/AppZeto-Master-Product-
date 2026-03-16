/**
 * Auth API – new backend (USER, ADMIN, RESTAURANT, DELIVERY).
 * User:  POST /auth/user/request-otp, verify-otp
 * Admin: POST /auth/admin/login
 * Restaurant: POST /auth/restaurant/request-otp, verify-otp
 * Delivery:   POST /auth/delivery/request-otp, verify-otp
 * Shared: POST /auth/refresh-token, /auth/logout; GET /auth/me
 */

import apiClient from "./axios.js";

const AUTH = {
  USER_REQUEST_OTP: "/auth/user/request-otp",
  USER_VERIFY_OTP: "/auth/user/verify-otp",
  ADMIN_LOGIN: "/auth/admin/login",
  RESTAURANT_REQUEST_OTP: "/auth/restaurant/request-otp",
  RESTAURANT_VERIFY_OTP: "/auth/restaurant/verify-otp",
  DELIVERY_REQUEST_OTP: "/auth/delivery/request-otp",
  DELIVERY_VERIFY_OTP: "/auth/delivery/verify-otp",
  REFRESH_TOKEN: "/auth/refresh-token",
  LOGOUT: "/auth/logout",
  ME: "/auth/me",
};

/**
 * Normalize phone to digits only (for backend 8–15 digits).
 * @param {string} phone - e.g. "+91 9876543210" or "9876543210"
 */
function normalizePhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.slice(-15);
}

/** User phone: exactly 10 digits, numeric only. */
const USER_PHONE_LENGTH = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Request OTP for user login.
 * Validation: phone required, numeric only, exactly 10 digits (last 10 if country code included).
 * @param {string} phone - Phone (with or without country code, e.g. "+91 9876543210")
 * @returns {Promise<{ data }>}
 */
export function requestUserOtp(phone) {
  const digits = normalizePhone(phone);
  if (!digits) {
    return Promise.reject(new Error("Phone number is required"));
  }
  if (!/^\d+$/.test(digits)) {
    return Promise.reject(new Error("Phone must contain only digits"));
  }
  const normalized = digits.length > USER_PHONE_LENGTH ? digits.slice(-USER_PHONE_LENGTH) : digits;
  if (normalized.length !== USER_PHONE_LENGTH) {
    return Promise.reject(new Error("Phone number must be exactly 10 digits"));
  }
  return apiClient.post(AUTH.USER_REQUEST_OTP, { phone: normalized });
}

/**
 * Verify OTP and login (user).
 * Validation: phone 10 digits, OTP required, exactly 4 digits numeric.
 * Backend returns { accessToken, refreshToken, user }.
 * @param {string} phone - Same format as request
 * @param {string} otp - 4-digit OTP only
 */
export function verifyUserOtp(phone, otp) {
  const digits = normalizePhone(phone);
  if (!digits) {
    return Promise.reject(new Error("Phone number is required"));
  }
  const normalized = digits.length > USER_PHONE_LENGTH ? digits.slice(-USER_PHONE_LENGTH) : digits;
  if (normalized.length !== USER_PHONE_LENGTH) {
    return Promise.reject(new Error("Phone number must be exactly 10 digits"));
  }
  const otpStr = String(otp ?? "").replace(/\D/g, "").slice(0, 4);
  if (!otpStr) {
    return Promise.reject(new Error("OTP is required"));
  }
  if (otpStr.length !== 4) {
    return Promise.reject(new Error("OTP must be exactly 4 digits"));
  }
  return apiClient.post(AUTH.USER_VERIFY_OTP, { phone: normalized, otp: otpStr });
}

/**
 * Admin login (email + password).
 * Validation: email required and valid format, password required and min 6 characters.
 * Backend returns { accessToken, refreshToken, user } (key is "user" not "admin").
 */
export function adminLogin(email, password) {
  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  if (!trimmedEmail) {
    return Promise.reject(new Error("Email is required"));
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return Promise.reject(new Error("Please enter a valid email address"));
  }
  const passwordStr = String(password ?? "");
  if (!passwordStr) {
    return Promise.reject(new Error("Password is required"));
  }
  if (passwordStr.length < 6) {
    return Promise.reject(new Error("Password must be at least 6 characters"));
  }
  return apiClient.post(AUTH.ADMIN_LOGIN, { email: trimmedEmail, password: passwordStr });
}

/**
 * Refresh access token.
 * @param {string} refreshToken
 * @returns {Promise<{ data }>} data.accessToken
 */
export function refreshToken(refreshToken) {
  if (!refreshToken) return Promise.reject(new Error("Refresh token is required"));
  return apiClient.post(AUTH.REFRESH_TOKEN, { refreshToken });
}

/**
 * Logout (invalidate refresh token).
 * @param {string} refreshToken
 */
export function logout(refreshToken) {
  if (!refreshToken) return Promise.resolve({ data: { success: true } });
  return apiClient.post(AUTH.LOGOUT, { refreshToken });
}

/**
 * Get current profile (requires Bearer).
 * @param {string} [module] - "user" | "admin" | "restaurant" | "delivery" (which token to send; default "user")
 */
export function getMe(module = "user") {
  return apiClient.get(AUTH.ME, { contextModule: module });
}

/**
 * Restaurant OTP auth (backend: same phone format as user, 4-digit OTP e.g. 1234).
 */
export function requestRestaurantOtp(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) {
    return Promise.reject(new Error("Phone must be at least 8 digits"));
  }
  return apiClient.post(AUTH.RESTAURANT_REQUEST_OTP, { phone: normalized });
}

export function verifyRestaurantOtp(phone, otp) {
  const normalized = normalizePhone(phone);
  const otpStr = String(otp).replace(/\D/g, "").slice(0, 6);
  if (!normalized || otpStr.length < 4) {
    return Promise.reject(new Error("Phone and 4-digit OTP are required"));
  }
  return apiClient.post(AUTH.RESTAURANT_VERIFY_OTP, { phone: normalized, otp: otpStr });
}

/**
 * Delivery partner OTP auth (backend: same phone + 4-digit OTP).
 */
export function requestDeliveryOtp(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) {
    return Promise.reject(new Error("Phone must be at least 8 digits"));
  }
  return apiClient.post(AUTH.DELIVERY_REQUEST_OTP, { phone: normalized });
}

export function verifyDeliveryOtp(phone, otp) {
  const normalized = normalizePhone(phone);
  const otpStr = String(otp).replace(/\D/g, "").slice(0, 6);
  if (!normalized || otpStr.length < 4) {
    return Promise.reject(new Error("Phone and 4-digit OTP are required"));
  }
  return apiClient.post(AUTH.DELIVERY_VERIFY_OTP, { phone: normalized, otp: otpStr });
}
