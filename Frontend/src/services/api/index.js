/**
 * API layer – auth connected to new backend; rest stubbed for UI compatibility.
 */

import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";
import * as authService from "./auth.js";

const stub = () =>
  Promise.resolve({
    data: { success: false, message: "Backend not connected", data: null },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  });

const createStubAPI = () =>
  new Proxy(
    {},
    {
      get(_, prop) {
        return () => stub();
      },
    },
  );

export default apiClient;
export { API_ENDPOINTS };

// Stub for non-auth endpoints so we don't hit backend for unimplemented routes (avoids 404s and extra calls).
// Auth is done via authAPI/authService which use apiClient directly.
const emptyDataStub = () =>
  Promise.resolve({
    data: { success: false, data: null },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  });

export const api = {
  get: (_url, _config) => emptyDataStub(),
  post: (_url, _data, _config) => emptyDataStub(),
  put: (_url, _data, _config) => emptyDataStub(),
  patch: (_url, _data, _config) => emptyDataStub(),
  delete: (_url, _config) => emptyDataStub(),
};

/** Auth API – user OTP + admin login via new backend */
export const authAPI = {
  sendOTP: (phone, _purpose = "login", _email = null) => {
    if (!phone) return Promise.reject(new Error("Phone is required"));
    return authService.requestUserOtp(phone);
  },
  verifyOTP: (phone, otp, _purpose, _name, _email, _role, _password, _referralCode) => {
    if (!phone || !otp) return Promise.reject(new Error("Phone and OTP are required"));
    return authService.verifyUserOtp(phone, otp);
  },
  getCurrentUser: () => authService.getMe("user"),
  refreshToken: (token) => authService.refreshToken(token),
  logout: (refreshToken) => {
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("user_refreshToken") : null);
    return authService.logout(token);
  },
};

/** Admin API – login via new backend */
export const adminAPI = {
  login: (email, password) => authService.adminLogin(email, password),
  getCurrentAdmin: () => authService.getMe("admin"),
  logout: (refreshToken) => {
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("admin_refreshToken") : null);
    return authService.logout(token);
  },
  // Restaurant approvals and join requests
  getPendingRestaurants: () =>
    apiClient.get("/v1/food/admin/restaurants/pending", { contextModule: "admin" }),
  approveRestaurant: (id) =>
    apiClient.patch(`/v1/food/admin/restaurants/${id}/approve`, null, {
      contextModule: "admin",
    }),
  rejectRestaurant: (id, reason) =>
    apiClient.patch(
      `/v1/food/admin/restaurants/${id}/reject`,
      { reason },
      { contextModule: "admin" },
    ),
  /** Delivery partner join requests for admin panel */
  getDeliveryPartnerJoinRequests: (params) =>
    apiClient.get("/v1/food/delivery/admin/join-requests", {
      params,
      contextModule: "admin",
    }),
};

/** Restaurant API – OTP login via new backend; no email/password. */
export const restaurantAPI = {
  sendOTP: (phone, _purpose = "login") => {
    if (!phone) return Promise.reject(new Error("Phone is required"));
    return authService.requestRestaurantOtp(phone);
  },
  verifyOTP: (phone, otp, _purpose, _name, _email) => {
    if (!phone || !otp) return Promise.reject(new Error("Phone and OTP are required"));
    return authService.verifyRestaurantOtp(phone, otp);
  },
  getMe: () => authService.getMe("restaurant"),
  logout: (refreshToken) => {
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("restaurant_refreshToken") : null);
    return authService.logout(token);
  },
  /** Backend has no email/password login; use phone OTP only. */
  login: (_email, _password) =>
    Promise.reject(new Error("Please use phone number and OTP to sign in.")),
  /**
   * Register a restaurant (multipart FormData).
   * Backend: POST /v1/food/restaurant/register
   */
  register: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(new Error("FormData is required"));
    }
    return apiClient.post("/v1/food/restaurant/register", formData);
  },
};

/** Delivery API – OTP login + registration via new backend. */
export const deliveryAPI = {
  sendOTP: (phone, _purpose = "login") => {
    if (!phone) return Promise.reject(new Error("Phone is required"));
    return authService.requestDeliveryOtp(phone);
  },
  verifyOTP: (phone, otp, _purpose, _name) => {
    if (!phone || !otp) return Promise.reject(new Error("Phone and OTP are required"));
    return authService.verifyDeliveryOtp(phone, otp);
  },
  getMe: () => authService.getMe("delivery"),
  logout: (refreshToken) => {
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("delivery_refreshToken") : null);
    return authService.logout(token);
  },
  /** POST /v1/food/delivery/register – multipart FormData (new partner, no token). */
  register: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(new Error("FormData with details and document files is required"));
    }
    return apiClient.post("/v1/food/delivery/register", formData);
  },
  /** PATCH /v1/food/delivery/profile – complete profile after OTP (Bearer token required). */
  completeProfile: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(new Error("FormData with details and document files is required"));
    }
    return apiClient.patch("/v1/food/delivery/profile", formData, { contextModule: "delivery" });
  },
};

export const userAPI = createStubAPI();
export const locationAPI = createStubAPI();
export const zoneAPI = createStubAPI();
export const uploadAPI = {
  /**
   * Upload a single image file to the backend (Cloudinary-backed).
   * @param {File|Blob} file
   * @param {{ folder?: string }} options
   */
  uploadMedia: (file, options = {}) => {
    if (!file) {
      return Promise.reject(new Error("File is required for upload"));
    }

    const formData = new FormData();
    formData.append("file", file);
    if (options.folder) {
      formData.append("folder", options.folder);
    }

    return apiClient.post("/v1/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
export const orderAPI = createStubAPI();
export const diningAPI = createStubAPI();
export const heroBannerAPI = createStubAPI();
export const publicAPI = createStubAPI();
