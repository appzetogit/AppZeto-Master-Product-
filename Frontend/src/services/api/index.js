/**
 * API layer - auth connected to new backend; rest stubbed for UI compatibility.
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

/** Auth API - user OTP + admin login via new backend */
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

/** Admin API - login via new backend */
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
    apiClient.get("/food/admin/restaurants/pending", { contextModule: "admin" }),
  approveRestaurant: (id) =>
    apiClient.patch(`/food/admin/restaurants/${id}/approve`, {}, {
      contextModule: "admin",
    }),
  rejectRestaurant: (id, reason) =>
    apiClient.patch(
      `/food/admin/restaurants/${id}/reject`,
      { reason },
      { contextModule: "admin" },
    ),
  /** Delivery partner join requests - uses /food/admin/delivery/* (new backend API) */
  getDeliveryPartnerJoinRequests: (params) =>
    apiClient.get("/food/admin/delivery/join-requests", {
      params,
      contextModule: "admin",
    }),
  /** List approved delivery partners (Deliveryman List page) */
  getDeliveryPartners: (params) =>
    apiClient.get("/food/admin/delivery/partners", {
      params,
      contextModule: "admin",
    }),
  /** Delivery boy wallets (stub until backend implements - returns empty so list still loads) */
  getDeliveryBoyWallets: (params) =>
    apiClient.get("/food/admin/delivery/wallets", {
      params,
      contextModule: "admin",
    }),
  getDeliveryPartnerById: (id) =>
    apiClient.get(`/food/admin/delivery/${id}`, { contextModule: "admin" }),
  approveDeliveryPartner: (id) =>
    apiClient.patch(`/food/admin/delivery/${String(id)}/approve`, {}, {
      contextModule: "admin",
    }),
  rejectDeliveryPartner: (id, reason) =>
    apiClient.patch(`/food/admin/delivery/${String(id)}/reject`, { reason: String(reason || "").trim() }, {
      contextModule: "admin",
    }),
  /** GET /food/admin/delivery/support-tickets - list all delivery support tickets (query: status, priority, search, page, limit). */
  getDeliverySupportTickets: (params) =>
    apiClient.get("/food/admin/delivery/support-tickets", { params, contextModule: "admin" }),
  /** GET /food/admin/delivery/support-tickets/stats - counts by status. */
  getDeliverySupportTicketStats: () =>
    apiClient.get("/food/admin/delivery/support-tickets/stats", { contextModule: "admin" }),
  /** PATCH /food/admin/delivery/support-tickets/:id - update adminResponse, status. */
  updateDeliverySupportTicket: (id, body) =>
    apiClient.patch(`/food/admin/delivery/support-tickets/${id}`, body ?? {}, { contextModule: "admin" }),
  /** List restaurants for admin (Explore More dropdowns, reports, etc.). Requires admin auth. */
  getRestaurants: (params = {}, config = {}) =>
    apiClient.get("/food/admin/restaurants", {
      params: { limit: 1000, ...params },
      contextModule: "admin",
      ...config,
    }),
  /** List delivery zones. Query: limit, page, isActive, search */
  getZones: (params = {}) =>
    apiClient.get("/food/admin/zones", { params: { limit: 1000, ...params }, contextModule: "admin" }),
  /** Get single zone by id */
  getZoneById: (id) =>
    apiClient.get(`/food/admin/zones/${id}`, { contextModule: "admin" }),
  /** Create zone. Body: name, zoneName?, country?, unit?, coordinates, isActive? */
  createZone: (body) =>
    apiClient.post("/food/admin/zones", body ?? {}, { contextModule: "admin" }),
  /** Update zone. Body: name?, zoneName?, country?, unit?, coordinates?, isActive? */
  updateZone: (id, body) =>
    apiClient.patch(`/food/admin/zones/${id}`, body ?? {}, { contextModule: "admin" }),
  /** Delete zone */
  deleteZone: (id) =>
    apiClient.delete(`/food/admin/zones/${id}`, { contextModule: "admin" }),
};

/** Restaurant API - OTP login via new backend; no email/password. */
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
   * Backend: POST /v1/food/restaurant/register (path relative to baseURL /api/v1)
   */
  register: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(new Error("FormData is required"));
    }
    return apiClient.post("/food/restaurant/register", formData);
  },
};

/** Single in-flight + short cache for delivery /auth/me - one call per page load / refresh. */
let deliveryMeInFlight = null;
let deliveryMeCached = null;
let deliveryMeCacheTime = 0;
const DELIVERY_ME_CACHE_MS = 3000;

const getDeliveryMeOnce = () => {
  const now = Date.now();
  if (deliveryMeCached && now - deliveryMeCacheTime < DELIVERY_ME_CACHE_MS) {
    return Promise.resolve(deliveryMeCached);
  }
  if (!deliveryMeInFlight) {
    deliveryMeInFlight = authService
      .getMe("delivery")
      .then((res) => {
        deliveryMeCached = res;
        deliveryMeCacheTime = Date.now();
        return res;
      })
      .finally(() => {
        deliveryMeInFlight = null;
      });
  }
  return deliveryMeInFlight;
};

/** Delivery API - OTP login + registration via new backend. */
export const deliveryAPI = {
  sendOTP: (phone, _purpose = "login") => {
    if (!phone) return Promise.reject(new Error("Phone is required"));
    return authService.requestDeliveryOtp(phone);
  },
  verifyOTP: (phone, otp, _purpose, _name) => {
    if (!phone || !otp) return Promise.reject(new Error("Phone and OTP are required"));
    return authService.verifyDeliveryOtp(phone, otp);
  },
  getMe: () => getDeliveryMeOnce(),
  /** Get delivery profile (same as getMe under the hood; maps response to profile shape). */
  getProfile: () =>
    getDeliveryMeOnce().then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: { profile: res.data?.data?.user ?? res.data?.data },
      },
    })),
  logout: (refreshToken) => {
    deliveryMeCached = null;
    deliveryMeCacheTime = 0;
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("delivery_refreshToken") : null);
    return authService.logout(token);
  },
  /** POST /food/delivery/register - multipart FormData (new partner, no token). */
  register: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(new Error("FormData with details and document files is required"));
    }
    return apiClient.post("/food/delivery/register", formData);
  },
  /** PATCH /food/delivery/profile - complete profile after OTP (Bearer token required). */
  completeProfile: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(new Error("FormData with details and document files is required"));
    }
    return apiClient.patch("/food/delivery/profile", formData, { contextModule: "delivery" });
  },
  /** PATCH /food/delivery/profile/details - JSON updates (vehicle number, etc). */
  updateProfileDetails: (payload) =>
    apiClient.patch("/food/delivery/profile/details", payload ?? {}, { contextModule: "delivery" }),
  /** PATCH /food/delivery/profile - multipart updates for photos/documents (uses same endpoint). */
  updateProfileMultipart: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(new Error("FormData is required"));
    }
    return apiClient.patch("/food/delivery/profile", formData, { contextModule: "delivery" });
  },
  /** POST /food/delivery/profile/photo-base64 - Flutter in-app camera base64 upload. */
  updateProfilePhotoBase64: (payload) =>
    apiClient.post("/food/delivery/profile/photo-base64", payload ?? {}, { contextModule: "delivery" }),
  /** PATCH /food/delivery/profile/bank-details - update bank details + PAN (JSON, Bearer required). */
  updateProfile: (payload) =>
    apiClient.patch("/food/delivery/profile/bank-details", payload ?? {}, {
      contextModule: "delivery",
    }),
  /** GET /food/delivery/support-tickets - list tickets for logged-in delivery partner. */
  getSupportTickets: () =>
    apiClient.get("/food/delivery/support-tickets", { contextModule: "delivery" }),
  /** POST /food/delivery/support-tickets - create ticket (body: subject, description, category?, priority?). */
  createSupportTicket: (body) =>
    apiClient.post("/food/delivery/support-tickets", body ?? {}, { contextModule: "delivery" }),
  /** GET /food/delivery/support-tickets/:id - get one ticket (own only). */
  getSupportTicketById: (id) =>
    apiClient.get(`/food/delivery/support-tickets/${id}`, { contextModule: "delivery" }),
  /** PATCH /food/delivery/availability - set online/offline (and optional lat/lng). */
  updateOnlineStatus: (isOnline) =>
    apiClient.patch("/food/delivery/availability", { status: isOnline ? "online" : "offline" }, { contextModule: "delivery" }),
  updateLocation: (latitude, longitude, isOnline) =>
    apiClient.patch(
      "/food/delivery/availability",
      { status: isOnline ? "online" : "offline", latitude, longitude },
      { contextModule: "delivery" }
    ),
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

    return apiClient.post("/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
export const orderAPI = createStubAPI();
export const diningAPI = createStubAPI();
export const heroBannerAPI = createStubAPI();
export const publicAPI = createStubAPI();
