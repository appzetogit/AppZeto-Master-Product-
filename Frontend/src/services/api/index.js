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

/** Single in-flight + short cache for user /auth/me - avoids duplicate calls. */
let userMeInFlight = null;
let userMeCached = null;
let userMeCacheTime = 0;
const USER_ME_CACHE_MS = 3000;

const getUserMeOnce = () => {
  const now = Date.now();
  if (userMeCached && now - userMeCacheTime < USER_ME_CACHE_MS) {
    return Promise.resolve(userMeCached);
  }
  if (!userMeInFlight) {
    userMeInFlight = authService
      .getMe("user")
      .then((res) => {
        userMeCached = res;
        userMeCacheTime = Date.now();
        return res;
      })
      .finally(() => {
        userMeInFlight = null;
      });
  }
  return userMeInFlight;
};

/** Auth API - user OTP + admin login via new backend */
export const authAPI = {
  sendOTP: (phone, _purpose = "login", _email = null) => {
    if (!phone) return Promise.reject(new Error("Phone is required"));
    return authService.requestUserOtp(phone);
  },
  verifyOTP: (
    phone,
    otp,
    _purpose,
    _name,
    _email,
    _role,
    _password,
    _referralCode,
  ) => {
    if (!phone || !otp)
      return Promise.reject(new Error("Phone and OTP are required"));
    return authService.verifyUserOtp(phone, otp, _referralCode);
  },
  getCurrentUser: () => getUserMeOnce(),
  refreshToken: (token) => authService.refreshToken(token),
  logout: (refreshToken) => {
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("user_refreshToken")
        : null);
    return authService.logout(token);
  },
};

export const supportAPI = {
  createTicket: (body) =>
    apiClient.post("/food/user/support/ticket", body ?? {}, { contextModule: "user" }),
  getMyTickets: (params = {}) =>
    apiClient.get("/food/user/support/my-tickets", { params, contextModule: "user" }),
  getSupportTicketsAdmin: (params = {}) =>
    apiClient.get("/food/admin/support-tickets", { params, contextModule: "admin" }),
  updateSupportTicketAdmin: (id, body = {}) =>
    apiClient.patch(`/food/admin/support-tickets/${String(id)}`, body ?? {}, { contextModule: "admin" }),
};

/** Admin API - new backend only (GET /auth/me, PATCH /auth/admin/profile, POST /auth/admin/change-password) */
export const adminAPI = {
  login: (email, password) => authService.adminLogin(email, password),
  /** POST /auth/admin/forgot-password/request-otp – only accepts registered admin email */
  requestForgotPasswordOtp: (email) =>
    apiClient.post("/auth/admin/forgot-password/request-otp", {
      email: String(email || "")
        .trim()
        .toLowerCase(),
    }),
  /** POST /auth/admin/forgot-password/reset – verify OTP and set new password in one call */
  resetPasswordWithOtp: (email, otp, newPassword) =>
    apiClient.post("/auth/admin/forgot-password/reset", {
      email: String(email || "")
        .trim()
        .toLowerCase(),
      otp: String(otp || "").replace(/\D/g, ""),
      newPassword: String(newPassword || ""),
    }),
  /** Raw /auth/me for admin (e.g. navbar). For Profile & Settings use getAdminProfile. */
  getCurrentAdmin: () => authService.getMe("admin"),
  /** Single API for admin profile: GET /auth/me, returns { data: { admin } }. Use on Profile & Settings only. */
  getAdminProfile: () =>
    authService.getMe("admin").then((res) => {
      const user =
        res?.data?.data?.user ??
        res?.data?.user ??
        res?.data?.data ??
        res?.data;
      return { data: { data: { admin: user }, admin: user } };
    }),
  /** PATCH /auth/admin/profile. Body: name?, phone?, profileImage? */
  updateAdminProfile: (body) =>
    apiClient.patch("/auth/admin/profile", body ?? {}, {
      contextModule: "admin",
    }),
  /** POST /auth/admin/change-password */
  changePassword: (currentPassword, newPassword) =>
    apiClient.post(
      "/auth/admin/change-password",
      { currentPassword, newPassword },
      { contextModule: "admin" },
    ),
  logout: (refreshToken) => {
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("admin_refreshToken")
        : null);
    return authService.logout(token);
  },
  // Restaurant approvals and join requests
  getPendingRestaurants: () =>
    apiClient.get("/food/admin/restaurants/pending", {
      contextModule: "admin",
    }),
  approveRestaurant: (id) =>
    apiClient.patch(
      `/food/admin/restaurants/${id}/approve`,
      {},
      {
        contextModule: "admin",
      },
    ),
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
    apiClient.patch(
      `/food/admin/delivery/${String(id)}/approve`,
      {},
      {
        contextModule: "admin",
      },
    ),
  rejectDeliveryPartner: (id, reason) =>
    apiClient.patch(
      `/food/admin/delivery/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      {
        contextModule: "admin",
      },
    ),
  /** GET /food/admin/delivery/support-tickets - list all delivery support tickets (query: status, priority, search, page, limit). */
  getDeliverySupportTickets: (params) =>
    apiClient.get("/food/admin/delivery/support-tickets", {
      params,
      contextModule: "admin",
    }),
  /** GET /food/admin/delivery/support-tickets/stats - counts by status. */
  getDeliverySupportTicketStats: () =>
    apiClient.get("/food/admin/delivery/support-tickets/stats", {
      contextModule: "admin",
    }),
  /** PATCH /food/admin/delivery/support-tickets/:id - update adminResponse, status. */
  updateDeliverySupportTicket: (id, body) =>
    apiClient.patch(`/food/admin/delivery/support-tickets/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  /** List restaurants for admin. Requires admin auth. */
  getRestaurants: (params = {}, config = {}) =>
    apiClient.get("/food/admin/restaurants", {
      params: { limit: 1000, ...params },
      contextModule: "admin",
      ...config,
    }),
  /** Categories (admin) */
  getCategories: (params = {}) =>
    apiClient.get("/food/admin/categories", { params, contextModule: "admin" }),
  /** Dining categories (admin) */
  getDiningCategories: (params = {}) =>
    apiClient.get("/food/admin/dining/categories", {
      params,
      contextModule: "admin",
    }),
  createDiningCategory: (body) =>
    apiClient.post("/food/admin/dining/categories", body ?? {}, {
      contextModule: "admin",
    }),
  updateDiningCategory: (id, body) =>
    apiClient.patch(`/food/admin/dining/categories/${String(id)}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteDiningCategory: (id) =>
    apiClient.delete(`/food/admin/dining/categories/${String(id)}`, {
      contextModule: "admin",
    }),
  getDiningRestaurants: (params = {}) =>
    apiClient.get("/food/admin/dining/restaurants", {
      params,
      contextModule: "admin",
    }),
  updateRestaurantDiningSettings: (restaurantId, body) =>
    apiClient.patch(
      `/food/admin/dining/restaurants/${String(restaurantId)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  createCategory: (body) =>
    apiClient.post("/food/admin/categories", body ?? {}, {
      contextModule: "admin",
    }),
  updateCategory: (id, body) =>
    apiClient.patch(`/food/admin/categories/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteCategory: (id) =>
    apiClient.delete(`/food/admin/categories/${id}`, {
      contextModule: "admin",
    }),
  approveCategory: (id) =>
    apiClient.patch(`/food/admin/categories/${String(id)}/approve`, {}, { contextModule: "admin" }),
  toggleCategoryStatus: (id) =>
    apiClient.patch(
      `/food/admin/categories/${id}/toggle`,
      {},
      { contextModule: "admin" },
    ),
  /** Get single restaurant by id (full details for View Details modal). */
  getRestaurantById: (id) =>
    apiClient.get(`/food/admin/restaurants/${id}`, { contextModule: "admin" }),
  /** Update restaurant basic details (admin). */
  updateRestaurant: (id, body) =>
    apiClient.patch(`/food/admin/restaurants/${String(id)}`, body ?? {}, { contextModule: "admin" }),
  /** Update restaurant status (admin). Body: { status: boolean } */
  updateRestaurantStatus: (id, status) =>
    apiClient.patch(`/food/admin/restaurants/${String(id)}/status`, { status: status !== false }, { contextModule: "admin" }),
  /** Update restaurant location (admin). Body includes lat/lng + address fields. */
  updateRestaurantLocation: (id, body) =>
    apiClient.patch(`/food/admin/restaurants/${String(id)}/location`, body ?? {}, { contextModule: "admin" }),
  /** Restaurant menu (admin) */
  getRestaurantMenuById: (id, config = {}) =>
    apiClient.get(`/food/admin/restaurants/${id}/menu`, {
      contextModule: "admin",
      ...config,
    }),
  updateRestaurantMenuById: (id, body) =>
    apiClient.patch(`/food/admin/restaurants/${id}/menu`, body ?? {}, {
      contextModule: "admin",
    }),
  /** Foods (admin) - separate collection */
  getFoods: (params = {}) =>
    apiClient.get("/food/admin/foods", { params, contextModule: "admin" }),
  createFood: (body) =>
    apiClient.post("/food/admin/foods", body ?? {}, { contextModule: "admin" }),
  updateFood: (id, body) =>
    apiClient.patch(`/food/admin/foods/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteFood: (id) =>
    apiClient.delete(`/food/admin/foods/${id}`, { contextModule: "admin" }),
  /** Food approvals (admin) - pending items created by restaurants */
  getPendingFoodApprovals: (params = {}) =>
    apiClient.get("/food/admin/foods/pending-approvals", {
      params,
      contextModule: "admin",
    }),
  approveFoodItem: (id) =>
    apiClient.patch(
      `/food/admin/foods/${String(id)}/approve`,
      {},
      { contextModule: "admin" },
    ),
  rejectFoodItem: (id, reason) =>
    apiClient.patch(
      `/food/admin/foods/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      { contextModule: "admin" },
    ),
  /** Customers (admin) */
  getCustomers: (params = {}) =>
    apiClient.get("/food/admin/customers", { params, contextModule: "admin" }),
  getCustomerById: (id) =>
    apiClient.get(`/food/admin/customers/${String(id)}`, {
      contextModule: "admin",
    }),
  updateCustomerStatus: (id, isActive) =>
    apiClient.patch(
      `/food/admin/customers/${String(id)}/status`,
      { isActive: isActive !== false },
      { contextModule: "admin" },
    ),
  /** Orders (admin) – list, get by id, assign delivery partner */
  getOrders: (params = {}) =>
    apiClient.get("/food/admin/orders", { params: { limit: 50, page: 1, ...params }, contextModule: "admin" }),
  getOrderById: (orderId) =>
    apiClient.get(`/food/admin/orders/${String(orderId)}`, { contextModule: "admin" }),
  assignDeliveryPartner: (orderId, deliveryPartnerId) =>
    apiClient.patch(`/food/admin/orders/${String(orderId)}/assign-delivery`, { deliveryPartnerId: String(deliveryPartnerId) }, { contextModule: "admin" }),
  /** Dispatch settings – auto vs manual assign (global) */
  getDispatchSettings: () =>
    apiClient.get("/food/admin/settings/dispatch", { contextModule: "admin" }),
  updateDispatchSettings: (dispatchMode) =>
    apiClient.patch("/food/admin/settings/dispatch", { dispatchMode }, { contextModule: "admin" }),
  /** Create restaurant (admin). Single API: POST /food/admin/restaurants. Body: JSON with image URLs. */
  createRestaurant: (body) =>
    apiClient.post("/food/admin/restaurants", body ?? {}, {
      contextModule: "admin",
    }),
  /** List delivery zones. Query: limit, page, isActive, search */
  getZones: (params = {}) =>
    apiClient.get("/food/admin/zones", {
      params: { limit: 1000, ...params },
      contextModule: "admin",
    }),
  /** Get single zone by id */
  getZoneById: (id) =>
    apiClient.get(`/food/admin/zones/${id}`, { contextModule: "admin" }),
  /** Create zone. Body: name, zoneName?, country?, unit?, coordinates, isActive? */
  createZone: (body) =>
    apiClient.post("/food/admin/zones", body ?? {}, { contextModule: "admin" }),
  /** Update zone. Body: name?, zoneName?, country?, unit?, coordinates?, isActive? */
  updateZone: (id, body) =>
    apiClient.patch(`/food/admin/zones/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  /** Delete zone */
  deleteZone: (id) =>
    apiClient.delete(`/food/admin/zones/${id}`, { contextModule: "admin" }),

  /** Public env variables (safe subset). Used for runtime keys like Google Maps. */
  // getPublicEnvVariables removed: rely on import.meta.env instead.

  /** Public categories (user app) - zone-aware */
  getPublicCategories: (params = {}, config = {}) =>
    apiClient.get("/food/restaurant/categories/public", { params: params ?? {}, ...config }),

  /** Offers & Coupons (admin) */
  getAllOffers: (params = {}) =>
    apiClient.get("/food/admin/offers", { params, contextModule: "admin" }),
  createAdminOffer: (body) =>
    apiClient.post("/food/admin/offers", body ?? {}, {
      contextModule: "admin",
    }),
  updateAdminOfferCartVisibility: (offerId, itemId, showInCart) =>
    apiClient.patch(
      `/food/admin/offers/${String(offerId)}/cart-visibility`,
      { itemId: String(itemId), showInCart: Boolean(showInCart) },
      { contextModule: "admin" },
    ),
  deleteAdminOffer: (offerId) =>
    apiClient.delete(`/food/admin/offers/${String(offerId)}`, {
      contextModule: "admin",
    }),

  /** Delivery Partner Bonus (admin) */
  getDeliveryPartnerBonusTransactions: (params = {}) =>
    apiClient.get("/food/admin/delivery/bonus-transactions", {
      params,
      contextModule: "admin",
    }),
  addDeliveryPartnerBonus: (deliveryPartnerId, amount, reference = "") =>
    apiClient.post(
      "/food/admin/delivery/bonus",
      {
        deliveryPartnerId: String(deliveryPartnerId),
        amount: Number(amount),
        reference: String(reference || ""),
      },
      { contextModule: "admin" },
    ),

  /** Earning Addon Offers (admin) */
  getEarningAddons: (params = {}) =>
    apiClient.get("/food/admin/delivery/earning-addons", {
      params,
      contextModule: "admin",
    }),
  createEarningAddon: (body) =>
    apiClient.post("/food/admin/delivery/earning-addons", body ?? {}, {
      contextModule: "admin",
    }),
  updateEarningAddon: (id, body) =>
    apiClient.patch(
      `/food/admin/delivery/earning-addons/${String(id)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  deleteEarningAddon: (id) =>
    apiClient.delete(`/food/admin/delivery/earning-addons/${String(id)}`, {
      contextModule: "admin",
    }),
  toggleEarningAddonStatus: (id, status) =>
    apiClient.patch(
      `/food/admin/delivery/earning-addons/${String(id)}/status`,
      { status: String(status) },
      { contextModule: "admin" },
    ),

  /** Earning Addon History (admin) */
  getEarningAddonHistory: (params = {}) =>
    apiClient.get("/food/admin/delivery/earning-addon-history", {
      params,
      contextModule: "admin",
    }),
  creditEarningToWallet: (historyId, notes = "") =>
    apiClient.post(
      `/food/admin/delivery/earning-addon-history/${String(historyId)}/credit`,
      { notes: String(notes || "") },
      { contextModule: "admin" },
    ),
  cancelEarningAddonHistory: (historyId, reason = "") =>
    apiClient.post(
      `/food/admin/delivery/earning-addon-history/${String(historyId)}/cancel`,
      { reason: String(reason || "") },
      { contextModule: "admin" },
    ),
  checkEarningAddonCompletions: (deliveryPartnerId, force = false) =>
    apiClient.post(
      "/food/admin/delivery/earning-addon-completions/check",
      { deliveryPartnerId: String(deliveryPartnerId), force: Boolean(force) },
      { contextModule: "admin" },
    ),

  /** Restaurant Commission (admin) */
  getRestaurantCommissionBootstrap: () =>
    apiClient.get("/food/admin/restaurant-commissions/bootstrap", {
      contextModule: "admin",
    }),
  getRestaurantCommissions: (params = {}) =>
    apiClient.get("/food/admin/restaurant-commissions", {
      params,
      contextModule: "admin",
    }),
  getRestaurantCommissionById: (id) =>
    apiClient.get(`/food/admin/restaurant-commissions/${String(id)}`, {
      contextModule: "admin",
    }),
  createRestaurantCommission: (body) =>
    apiClient.post("/food/admin/restaurant-commissions", body ?? {}, {
      contextModule: "admin",
    }),
  updateRestaurantCommission: (id, body) =>
    apiClient.patch(
      `/food/admin/restaurant-commissions/${String(id)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  deleteRestaurantCommission: (id) =>
    apiClient.delete(`/food/admin/restaurant-commissions/${String(id)}`, {
      contextModule: "admin",
    }),
  toggleRestaurantCommissionStatus: (id) =>
    apiClient.patch(
      `/food/admin/restaurant-commissions/${String(id)}/toggle`,
      {},
      { contextModule: "admin" },
    ),
  /** Backward-compatible alias used in UI */
  getApprovedRestaurants: (params = {}) =>
    apiClient.get("/food/admin/restaurants", {
      params: { status: "approved", limit: 1000, ...params },
      contextModule: "admin",
    }),

  /** Delivery Boy Commission Rules (admin) */
  getCommissionRules: () =>
    apiClient.get("/food/admin/delivery/commission-rules", {
      contextModule: "admin",
    }),
  createCommissionRule: (body) =>
    apiClient.post("/food/admin/delivery/commission-rules", body ?? {}, {
      contextModule: "admin",
    }),
  updateCommissionRule: (id, body) =>
    apiClient.patch(
      `/food/admin/delivery/commission-rules/${String(id)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  deleteCommissionRule: (id) =>
    apiClient.delete(`/food/admin/delivery/commission-rules/${String(id)}`, {
      contextModule: "admin",
    }),
  toggleCommissionRuleStatus: (id, status) =>
    apiClient.patch(
      `/food/admin/delivery/commission-rules/${String(id)}/status`,
      { status: Boolean(status) },
      { contextModule: "admin" },
    ),

  /** Fee Settings (admin) */
  getFeeSettings: () =>
    apiClient.get("/food/admin/fee-settings", { contextModule: "admin" }),
  createOrUpdateFeeSettings: (body) =>
    apiClient.put("/food/admin/fee-settings", body ?? {}, {
      contextModule: "admin",
    }),

  /** Referral Settings (admin) */
  getReferralSettings: () =>
    apiClient.get("/food/admin/referral-settings", { contextModule: "admin" }),
  createOrUpdateReferralSettings: (body) =>
    apiClient.put("/food/admin/referral-settings", body ?? {}, {
      contextModule: "admin",
    }),

  /** Safety / Emergency Reports (admin) */
  getSafetyEmergencyReports: (params) =>
    apiClient.get("/food/admin/safety-emergency-reports", {
      params: params ?? {},
      contextModule: "admin",
    }),
  updateSafetyEmergencyStatus: (id, status) =>
    apiClient.put(
      `/food/admin/safety-emergency-reports/${String(id)}/status`,
      { status: String(status) },
      { contextModule: "admin" },
    ),
  updateSafetyEmergencyPriority: (id, priority) =>
    apiClient.put(
      `/food/admin/safety-emergency-reports/${String(id)}/priority`,
      { priority: String(priority) },
      { contextModule: "admin" },
    ),
  deleteSafetyEmergencyReport: (id) =>
    apiClient.delete(`/food/admin/safety-emergency-reports/${String(id)}`, {
      contextModule: "admin",
    }),

  /** Delivery Cash Limit (admin) */
  getDeliveryCashLimit: () =>
    apiClient.get("/food/admin/delivery-cash-limit", {
      contextModule: "admin",
    }),
  updateDeliveryCashLimit: (body) =>
    apiClient.patch("/food/admin/delivery-cash-limit", body ?? {}, {
      contextModule: "admin",
    }),

  /** Delivery Emergency Help (admin) */
  getEmergencyHelp: () =>
    apiClient.get("/food/admin/delivery-emergency-help", {
      contextModule: "admin",
    }),
  createOrUpdateEmergencyHelp: (body) =>
    apiClient.put("/food/admin/delivery-emergency-help", body ?? {}, {
      contextModule: "admin",
    }),

  /** Restaurant add-ons approval (admin) */
  getRestaurantAddons: (params = {}) =>
    apiClient.get("/food/admin/addons", { params: params ?? {}, contextModule: "admin" }),
  approveRestaurantAddon: (id) =>
    apiClient.patch(`/food/admin/addons/${String(id)}/approve`, {}, { contextModule: "admin" }),
  rejectRestaurantAddon: (id, reason) =>
    apiClient.patch(
      `/food/admin/addons/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      { contextModule: "admin" },
    ),
};

/** Restaurant API - OTP login via new backend; no email/password. */
export const restaurantAPI = {
  sendOTP: (phone, _purpose = "login") => {
    if (!phone) return Promise.reject(new Error("Phone is required"));
    return authService.requestRestaurantOtp(phone);
  },
  verifyOTP: (phone, otp, _purpose, _name, _email) => {
    if (!phone || !otp)
      return Promise.reject(new Error("Phone and OTP are required"));
    return authService.verifyRestaurantOtp(phone, otp);
  },
  getMe: () => authService.getMe("restaurant"),
  /** Restaurant dashboard: fetch current restaurant profile (deduped + short-cached). */
  getCurrentRestaurant: () => getRestaurantCurrentOnce(),
  /** Restaurant hub dashboard bootstrap. */
  getToHubData: (config = {}) =>
    apiClient.get("/food/restaurant/to-hub", {
      contextModule: "restaurant",
      ...config,
    }),
  /** Finance dashboard (stubbed if backend doesn't provide endpoint). */
  getFinance: (params = {}) => {
    // NOTE: Backend may not have a /food/restaurant/finance endpoint.
    // This stub provides a consistent response shape so the UI can render.
    // Replace with a real endpoint if/when available.
    const fakeData = {
      success: true,
      data: {
        restaurant: {
          name: "Your Restaurant",
          restaurantId: "REST000001",
          address: "Your address",
        },
        currentCycle: {
          estimatedPayout: 0,
          totalOrders: 0,
          orders: [],
          payoutDate: null,
          start: "15",
          end: "21",
          month: "Dec",
          year: "25",
        },
        pastCycles: {
          orders: [],
          totalOrders: 0,
        },
      },
    };

    return Promise.resolve({ data: fakeData });
  },
  /** Fetch restaurant by owner (stub for missing backend endpoint). */
  getRestaurantByOwner: () =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          restaurant: {
            name: "Your Restaurant",
            restaurantId: "REST000001",
            address: "Your address",
          },
        },
      },
    }),
  /** Submit a withdrawal request (stubbed). */
  createWithdrawalRequest: (amount) => {
    return Promise.resolve({
      data: {
        success: true,
        message: `Withdrawal request for ₹${Number(amount).toFixed(2)} received.`,
      },
    });
  },
  /** Update restaurant profile fields (name/cuisines/location/menuImages). */
  updateProfile: (body) =>
    apiClient
      .patch("/food/restaurant/profile", body ?? {}, {
        contextModule: "restaurant",
      })
      .then((res) => {
        // Keep cache coherent to avoid an immediate refetch storm.
        restaurantCurrentCached = res;
        restaurantCurrentCacheTime = Date.now();
        return res;
      }),
  /** PATCH /food/restaurant/availability. Body: { isAcceptingOrders: boolean } */
  updateAcceptingOrders: (isAcceptingOrders) =>
    apiClient
      .patch(
        "/food/restaurant/availability",
        { isAcceptingOrders: Boolean(isAcceptingOrders) },
        { contextModule: "restaurant" },
      )
      .then((res) => {
        // Keep cache coherent to avoid an immediate refetch storm.
        restaurantCurrentCached = res;
        restaurantCurrentCacheTime = Date.now();
        return res;
      }),
  /** Upload and set restaurant profile image (multipart). Field name: file */
  uploadProfileImage: (file) => {
    if (!file) return Promise.reject(new Error("File is required"));
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/food/restaurant/profile/profile-image", formData, {
      contextModule: "restaurant",
    });
  },
  /** Upload a menu/cover image (multipart). Does not auto-attach; use updateProfile(menuImages) after. */
  uploadMenuImage: (file) => {
    if (!file) return Promise.reject(new Error("File is required"));
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/food/restaurant/profile/menu-image", formData, {
      contextModule: "restaurant",
    });
  },
  /** Public Offers for users (global/selected restaurant) */
  getPublicOffers: () =>
    apiClient.get("/food/restaurant/offers"),
  /** Backward-compat helper used by Cart: returns coupons array for an item by adapting public offers */
  getCouponsByItemIdPublic: (restaurantId, _itemId) =>
    apiClient.get("/food/restaurant/offers").then((res) => {
      const list = res?.data?.data?.allOffers || res?.data?.allOffers || [];
      const now = Date.now();
      const coupons = list
        .filter((o) => {
          // Guard: respect selected restaurant scope
          if (String(o?.restaurantScope) === "selected") {
            if (!restaurantId) return false;
            return String(o.restaurantId || "") === String(restaurantId || "");
          }
          return true;
        })
        .map((o) => {
          const isPct = o.discountType === "percentage";
          return {
            couponCode: o.couponCode,
            discountType: o.discountType,
            discountPercentage: isPct ? Number(o.discountValue) || 0 : 0,
            originalPrice: 0,
            discountedPrice: 0,
            minOrderValue: Number(o.minOrderValue || 0),
            minOrder: Number(o.minOrderValue || 0),
            maxDiscount: o.maxDiscount != null ? Number(o.maxDiscount) : null,
            customerGroup: o.customerScope || "all",
            isGlobalCoupon: true,
            endDate: o.endDate || null,
            showInCart: o.showInCart !== false,
            _ts: now,
          };
        });
      return { data: { success: true, data: { coupons } } };
    }),
  /** Categories (restaurant dashboard) */
  getCategories: (params = {}) =>
    // Compact payload for item creation forms (id + name only).
    apiClient.get("/food/restaurant/categories", {
      params: { compact: true, limit: 1000, ...params },
      contextModule: "restaurant",
    }),
  // For MenuCategoriesPage compatibility
  getAllCategories: (params = {}) =>
    apiClient.get("/food/restaurant/categories", {
      params: {
        includeInactive: true,
        withCounts: true,
        limit: 1000,
        ...params,
      },
      contextModule: "restaurant",
    }),
  createCategory: (body) =>
    apiClient.post("/food/restaurant/categories", body ?? {}, {
      contextModule: "restaurant",
    }),
  updateCategory: (id, body) =>
    apiClient.patch(`/food/restaurant/categories/${String(id)}`, body ?? {}, {
      contextModule: "restaurant",
    }),
  deleteCategory: (id) =>
    apiClient.delete(`/food/restaurant/categories/${String(id)}`, {
      contextModule: "restaurant",
    }),
  /** Menu (restaurant dashboard) */
  getMenu: (params = {}) =>
    apiClient.get("/food/restaurant/menu", {
      params,
      contextModule: "restaurant",
    }),
  /** Orders (restaurant dashboard) */
  getOrders: (params = {}) =>
    apiClient.get("/food/restaurant/orders", {
      params: { limit: 50, page: 1, ...params },
      contextModule: "restaurant",
    }),
  getOrderById: (orderId) =>
    apiClient.get(`/food/restaurant/orders/${String(orderId)}`, {
      contextModule: "restaurant",
    }),
  updateMenu: (body) =>
    apiClient.patch("/food/restaurant/menu", body ?? {}, {
      contextModule: "restaurant",
    }),
  /** Outlet timings (restaurant dashboard) */
  getOutletTimings: () =>
    apiClient.get("/food/restaurant/outlet-timings", { contextModule: "restaurant" }),
  saveOutletTimings: (outletTimings) =>
    apiClient.put(
      "/food/restaurant/outlet-timings",
      { outletTimings: outletTimings || {} },
      { contextModule: "restaurant" },
    ),
  /** Foods (restaurant) - stored in food_items collection */
  createFood: (body) =>
    apiClient.post("/food/restaurant/foods", body ?? {}, {
      contextModule: "restaurant",
    }),
  updateFood: (id, body) =>
    apiClient.patch(`/food/restaurant/foods/${String(id)}`, body ?? {}, {
      contextModule: "restaurant",
    }),
  /** Orders (restaurant dashboard) */
  getOrders: (() => {
    // Single-flight de-dupe to avoid duplicate GETs in React StrictMode / double-mount.
    let inFlight = null;
    let inFlightKey = "";
    let cache = null;
    let cacheKey = "";
    let cacheAt = 0;
    const CACHE_MS = 800;

    const buildKey = (p = {}) => JSON.stringify({ limit: 50, page: 1, ...p });

    return (params = {}) => {
      const key = buildKey(params);
      const now = Date.now();

      if (cache && cacheKey === key && now - cacheAt < CACHE_MS) {
        return Promise.resolve(cache);
      }

      if (inFlight && inFlightKey === key) return inFlight;

      inFlightKey = key;
      inFlight = apiClient
      .get("/food/restaurant/orders", {
        params: { limit: 50, page: 1, ...params },
        contextModule: "restaurant",
      })
      .then((res) => {
        // Backend paginated shape: { data: { data: [...], meta: {...} } }
        // Normalize to { data: { data: { orders: [...], meta } } } for restaurant UI pages.
        const payload = res?.data?.data || {};
        const rowsRaw = Array.isArray(payload.data) ? payload.data : [];

        // Normalize backend order fields to match existing restaurant UI expectations.
        // UI historically uses: order.status, order.address, order.total, order.paymentMethod
        const normalizeStatus = (s) => {
          const v = String(s || "").toLowerCase();
          // Backend: created -> treat as confirmed/new in UI
          if (v === "created") return "confirmed";
          // Backend: ready_for_pickup -> ready
          if (v === "ready_for_pickup") return "ready";
          // Backend: picked_up -> out_for_delivery (restaurant handed over)
          if (v === "picked_up") return "out_for_delivery";
          return v || "confirmed";
        };

        const rows = rowsRaw.map((o) => {
          const status = normalizeStatus(o.orderStatus || o.status);
          const address = o.deliveryAddress || o.address;
          const total = o.pricing?.total ?? o.total ?? 0;
          const paymentMethod = o.payment?.method || o.paymentMethod || null;
          return { ...o, status, address, total, paymentMethod };
        });
        const meta = payload.meta || {};
        const normalized = {
          ...res,
          data: {
            ...res.data,
            data: { orders: rows, meta },
          },
        };

        cache = normalized;
        cacheKey = key;
        cacheAt = Date.now();
        return normalized;
      })
      .finally(() => {
        inFlight = null;
        inFlightKey = "";
      });

      return inFlight;
    };
  })(),
  updateOrderStatus: (orderId, body) => {
    const raw = body ?? {};
    const outgoing = { ...raw };

    // Translate UI-friendly statuses to backend enum values.
    const normalizeOutgoingStatus = (s) => {
      const v = String(s || "").toLowerCase().trim();
      if (!v) return v;
      if (v === "ready") return "ready_for_pickup";
      if (v === "out_for_delivery") return "picked_up";
      if (v === "cancelled") return "cancelled_by_restaurant";
      return v;
    };

    if (outgoing.orderStatus) {
      outgoing.orderStatus = normalizeOutgoingStatus(outgoing.orderStatus);
    }

    return apiClient.patch(
      `/food/restaurant/orders/${String(orderId)}/status`,
      outgoing,
      { contextModule: "restaurant" }
    );
  },
  /**
   * Accept an incoming order (restaurant).
   * UI expects this to move order into "preparing" bucket.
   * Backend supports PATCH /food/restaurant/orders/:orderId/status with { orderStatus }.
   */
  acceptOrder: (orderId, _prepTimeMins = null) =>
    restaurantAPI.updateOrderStatus(orderId, { orderStatus: "preparing" }),
  /**
   * Reject/cancel order by restaurant.
   * Backend orderStatus enum: cancelled_by_restaurant.
   */
  rejectOrder: (orderId, _reason = "") =>
    restaurantAPI.updateOrderStatus(orderId, { orderStatus: "cancelled_by_restaurant" }),
  /** Mark order ready (restaurant handoff). */
  markOrderReady: (orderId) =>
    restaurantAPI.updateOrderStatus(orderId, { orderStatus: "ready_for_pickup" }),
  /**
   * Get a single order by id for restaurant screens.
   * Backend doesn't yet expose GET /food/restaurant/orders/:id in this repo,
   * so we fallback to list+filter to keep UI working.
   */
  getOrderById: async (orderId) => {
    const res = await restaurantAPI.getOrders({ page: 1, limit: 100 });
    const orders = res?.data?.data?.orders || [];
    const match = orders.find(
      (o) => String(o._id) === String(orderId) || String(o.orderId) === String(orderId)
    );
    return {
      ...res,
      data: {
        ...res.data,
        data: { order: match || null },
      },
    };
  },
  /** Add-ons (restaurant) - approval handled by admin */
  getAddons: (params = {}) =>
    apiClient.get("/food/restaurant/addons", {
      // Backend validator enforces limit <= 100
      params: { limit: 100, page: 1, ...params },
      contextModule: "restaurant",
    }),
  addAddon: (body) =>
    apiClient.post("/food/restaurant/addons", body ?? {}, { contextModule: "restaurant" }),
  updateAddon: (id, body) =>
    apiClient.patch(`/food/restaurant/addons/${String(id)}`, body ?? {}, {
      contextModule: "restaurant",
    }),
  deleteAddon: (id) =>
    apiClient.delete(`/food/restaurant/addons/${String(id)}`, {
      contextModule: "restaurant",
    }),
  logout: (refreshToken) => {
    restaurantCurrentInFlight = null;
    restaurantCurrentCached = null;
    restaurantCurrentCacheTime = 0;
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("restaurant_refreshToken")
        : null);
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
  /** Public: list approved restaurants for user app */
  getRestaurants: (params = {}, config = {}) =>
    getPublicRestaurantsOnce(params, config),
  /** Public: get single approved restaurant by id or slug */
  getRestaurantById: (id, config = {}) =>
    apiClient.get(`/food/restaurant/restaurants/${String(id)}`, { ...config }),
  /** Public: get approved menu by restaurant id or slug */
  getMenuByRestaurantId: (id, config = {}) =>
    getPublicRestaurantMenuOnce(id, config),
  /** Public: get outlet timings by restaurant id */
  getOutletTimingsByRestaurantId: (id, config = {}) =>
    getPublicRestaurantOutletTimingsOnce(id, config),
  /** Public (user app): approved add-ons by restaurant id/slug */
  getAddonsByRestaurantId: (id, config = {}) =>
    apiClient.get(`/food/restaurant/restaurants/${String(id)}/addons`, { ...config }),
  /** Public: list coupons/offers created by admin */
  getPublicOffers: (params = {}, config = {}) =>
    apiClient.get("/food/restaurant/offers", { params, ...config }),
};

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function createInFlightCache({ ttlMs }) {
  const inFlight = new Map();
  const cached = new Map(); // key -> { t, v }

  const getCached = (key) => {
    const hit = cached.get(key);
    if (!hit) return null;
    if (Date.now() - hit.t > ttlMs) {
      cached.delete(key);
      return null;
    }
    return hit.v;
  };

  const getOrCreate = (key, factory) => {
    const cachedValue = getCached(key);
    if (cachedValue) return Promise.resolve(cachedValue);
    if (inFlight.has(key)) return inFlight.get(key);
    const p = Promise.resolve()
      .then(factory)
      .then((res) => {
        cached.set(key, { t: Date.now(), v: res });
        return res;
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, p);
    return p;
  };

  return { getOrCreate };
}

// Public user-app endpoints can be called by multiple components/effects on refresh (and React StrictMode in dev).
// A small in-flight + short TTL cache collapses duplicate requests without changing functionality.
const publicRestaurantsCache = createInFlightCache({ ttlMs: 3000 });
const publicRestaurantMenuCache = createInFlightCache({ ttlMs: 3000 });
const publicRestaurantOutletTimingsCache = createInFlightCache({ ttlMs: 3000 });
const publicGenericGetCache = createInFlightCache({ ttlMs: 3000 });

export const publicGetOnce = (url, config = {}) => {
  const safeUrl = typeof url === "string" ? url.trim() : "";
  const { noCache, params, ...axiosConfig } = config || {};
  if (!safeUrl) return Promise.reject(new Error("url is required"));

  if (noCache) {
    return apiClient.get(safeUrl, { params, ...axiosConfig });
  }

  const keyParams = params && typeof params === "object" ? { ...params } : params;
  if (keyParams && typeof keyParams === "object") {
    // `_ts` is used as a cache-buster in some call sites; ignore it for dedupe purposes.
    delete keyParams._ts;
  }

  const key = `GET:${safeUrl}:${stableStringify(keyParams)}`;
  return publicGenericGetCache.getOrCreate(key, () =>
    apiClient.get(safeUrl, { params, ...axiosConfig }),
  );
};

const getPublicRestaurantsOnce = (params = {}, config = {}) => {
  const { noCache, ...axiosConfig } = config || {};
  if (noCache) {
    return apiClient.get("/food/restaurant/restaurants", {
      params: { limit: 1000, ...params },
      ...axiosConfig,
    });
  }
  const keyParams = { limit: 1000, ...params };
  // `_ts` is an explicit cache-buster in many call sites; ignore it for dedupe purposes.
  if (keyParams && typeof keyParams === "object") {
    delete keyParams._ts;
  }
  const key = `restaurants:${stableStringify(keyParams)}`;
  return publicRestaurantsCache.getOrCreate(key, () =>
    apiClient.get("/food/restaurant/restaurants", {
      params: { limit: 1000, ...params },
      ...axiosConfig,
    }),
  );
};

const getPublicRestaurantMenuOnce = (id, config = {}) => {
  const safeId = String(id || "").trim();
  const { noCache, ...axiosConfig } = config || {};
  if (!safeId) {
    return Promise.resolve({
      data: { success: false, data: null },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    });
  }
  if (noCache) {
    return apiClient.get(`/food/restaurant/restaurants/${safeId}/menu`, {
      ...axiosConfig,
    });
  }
  const key = `menu:${safeId}`;
  return publicRestaurantMenuCache.getOrCreate(key, () =>
    apiClient.get(`/food/restaurant/restaurants/${safeId}/menu`, {
      ...axiosConfig,
    }),
  );
};

const getPublicRestaurantOutletTimingsOnce = (id, config = {}) => {
  const safeId = String(id || "").trim();
  const { noCache, ...axiosConfig } = config || {};
  if (!safeId) {
    return Promise.resolve({
      data: { success: false, data: null },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    });
  }
  if (noCache) {
    return apiClient.get(
      `/food/restaurant/restaurants/${safeId}/outlet-timings`,
      { ...axiosConfig },
    );
  }
  const key = `outletTimings:${safeId}`;
  return publicRestaurantOutletTimingsCache.getOrCreate(key, () =>
    apiClient.get(
      `/food/restaurant/restaurants/${safeId}/outlet-timings`,
      { ...axiosConfig },
    ),
  );
};

/** Single in-flight + short cache for restaurant /food/restaurant/current - prevents request storms. */
let restaurantCurrentInFlight = null;
let restaurantCurrentCached = null;
let restaurantCurrentCacheTime = 0;
const RESTAURANT_CURRENT_CACHE_MS = 3000;

const getRestaurantCurrentOnce = () => {
  const now = Date.now();
  if (
    restaurantCurrentCached &&
    now - restaurantCurrentCacheTime < RESTAURANT_CURRENT_CACHE_MS
  ) {
    return Promise.resolve(restaurantCurrentCached);
  }
  if (!restaurantCurrentInFlight) {
    restaurantCurrentInFlight = apiClient
      .get("/food/restaurant/current", { contextModule: "restaurant" })
      .then((res) => {
        restaurantCurrentCached = res;
        restaurantCurrentCacheTime = Date.now();
        return res;
      })
      .finally(() => {
        restaurantCurrentInFlight = null;
      });
  }
  return restaurantCurrentInFlight;
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
    if (!phone || !otp)
      return Promise.reject(new Error("Phone and OTP are required"));
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
  getReferralStats: () =>
    apiClient.get("/food/delivery/referrals/stats", { contextModule: "delivery" }),
  logout: (refreshToken) => {
    deliveryMeCached = null;
    deliveryMeCacheTime = 0;
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("delivery_refreshToken")
        : null);
    return authService.logout(token);
  },
  /** POST /food/delivery/register - multipart FormData (new partner, no token). */
  register: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(
        new Error("FormData with details and document files is required"),
      );
    }
    return apiClient.post("/food/delivery/register", formData);
  },
  /** PATCH /food/delivery/profile - complete profile after OTP (Bearer token required). */
  completeProfile: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(
        new Error("FormData with details and document files is required"),
      );
    }
    return apiClient.patch("/food/delivery/profile", formData, {
      contextModule: "delivery",
    });
  },
  /** PATCH /food/delivery/profile/details - JSON updates (vehicle number, etc). */
  updateProfileDetails: (payload) =>
    apiClient.patch("/food/delivery/profile/details", payload ?? {}, {
      contextModule: "delivery",
    }),
  /** PATCH /food/delivery/profile - multipart updates for photos/documents (uses same endpoint). */
  updateProfileMultipart: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(new Error("FormData is required"));
    }
    return apiClient.patch("/food/delivery/profile", formData, {
      contextModule: "delivery",
    });
  },
  /** POST /food/delivery/profile/photo-base64 - Flutter in-app camera base64 upload. */
  updateProfilePhotoBase64: (payload) =>
    apiClient.post("/food/delivery/profile/photo-base64", payload ?? {}, {
      contextModule: "delivery",
    }),
  /** PATCH /food/delivery/profile/bank-details - update bank details + PAN (JSON, Bearer required). */
  updateProfile: (payload) =>
    apiClient.patch("/food/delivery/profile/bank-details", payload ?? {}, {
      contextModule: "delivery",
    }),
  /** GET /food/delivery/support-tickets - list tickets for logged-in delivery partner. */
  getSupportTickets: () =>
    apiClient.get("/food/delivery/support-tickets", {
      contextModule: "delivery",
    }),
  /** POST /food/delivery/support-tickets - create ticket (body: subject, description, category?, priority?). */
  createSupportTicket: (body) =>
    apiClient.post("/food/delivery/support-tickets", body ?? {}, {
      contextModule: "delivery",
    }),
  /** GET /food/delivery/support-tickets/:id - get one ticket (own only). */
  getSupportTicketById: (id) =>
    apiClient.get(`/food/delivery/support-tickets/${id}`, {
      contextModule: "delivery",
    }),
  /** PATCH /food/delivery/availability - set online/offline (and optional lat/lng). */
  updateOnlineStatus: (isOnline) =>
    apiClient.patch(
      "/food/delivery/availability",
      { status: isOnline ? "online" : "offline" },
      { contextModule: "delivery" },
    ),
  updateLocation: (latitude, longitude, isOnline) =>
    apiClient.patch(
      "/food/delivery/availability",
      { status: isOnline ? "online" : "offline", latitude, longitude },
      { contextModule: "delivery" },
    ),
  /** Orders */
  getOrders: (params = {}) =>
    apiClient.get("/food/delivery/orders/available", {
      params: { limit: 50, page: 1, ...params },
      contextModule: "delivery",
    }),
  getOrderDetails: (orderId) =>
    apiClient.get(`/food/delivery/orders/${String(orderId)}`, {
      contextModule: "delivery",
    }),
  /** GET /food/delivery/current - fallback for some UI hooks */
  getCurrentDelivery: () =>
    getDeliveryMeOnce(),
  acceptOrder: (orderId, body = {}) =>
    apiClient.patch(`/food/delivery/orders/${String(orderId)}/accept`, body ?? {}, {
      contextModule: "delivery",
    }),
  rejectOrder: (orderId, body = {}) =>
    apiClient.patch(`/food/delivery/orders/${String(orderId)}/reject`, body ?? {}, {
      contextModule: "delivery",
    }),
  /**
   * PATCH /food/delivery/orders/:orderId/reached-pickup
   * Marks "reached pickup" (arrival at restaurant) in backend order deliveryState.
   */
  confirmReachedPickup: (orderId) =>
    apiClient.patch(
      `/food/delivery/orders/${String(orderId)}/reached-pickup`,
      {},
      { contextModule: "delivery" },
    ),
  /** 
   * Confirm order ID and upload bill image (Picked Up slide).
   * Backend endpoint: PATCH /food/delivery/orders/:id/confirm-pickup
   */
  confirmOrderId: (orderId, confirmedOrderId, location = {}, data = {}) =>
    apiClient.patch(`/food/delivery/orders/${String(orderId)}/confirm-pickup`, {
      confirmedOrderId,
      latitude: location.lat,
      longitude: location.lng,
      billImageUrl: data.billImageUrl
    }, {
      contextModule: "delivery",
    }),
  confirmReachedDrop: (orderId) =>
    apiClient.patch(`/food/delivery/orders/${String(orderId)}/reached-drop`, {}, {
      contextModule: "delivery",
    }),
  verifyDropOtp: (orderId, otp) =>
    apiClient.post(`/food/delivery/orders/${String(orderId)}/verify-drop-otp`, { otp: String(otp) }, {
      contextModule: "delivery",
    }),
  /** POST /food/delivery/orders/:orderId/collect/qr - create Razorpay payment link (COD collection) */
  createCollectQr: (orderId, body = {}) =>
    apiClient.post(`/food/delivery/orders/${String(orderId)}/collect/qr`, body ?? {}, {
      contextModule: "delivery",
    }),
  /** GET /food/delivery/orders/:orderId/payment-status - check COD/QR payment status */
  getPaymentStatus: (orderId) =>
    apiClient.get(`/food/delivery/orders/${String(orderId)}/payment-status`, {
      contextModule: "delivery",
    }),
  completeDelivery: (orderId, body = {}) => {
    // Backward-compatible: older UI calls completeDelivery(orderId, rating, review)
    // where rating is a number (sent as raw JSON like "3"). Normalize to an object.
    let payload = body ?? {};
    if (typeof payload === "number" || typeof payload === "string" || payload == null) {
      payload = { rating: payload == null ? null : Number(payload) };
    }
    return apiClient.patch(`/food/delivery/orders/${String(orderId)}/complete`, payload, {
      contextModule: "delivery",
    });
  },
  updateOrderStatus: (orderId, body = {}) =>
    apiClient.patch(`/food/delivery/orders/${String(orderId)}/status`, body ?? {}, {
      contextModule: "delivery",
    }),
  /** Registration Re-verification */
  reverify: () =>
    apiClient.post("/food/delivery/reverify", {}, { contextModule: "delivery" }),
  /** GET /food/delivery/wallet - wallet for Pocket/requests page (backend) */
  getWallet: () =>
    apiClient.get("/food/delivery/wallet", { contextModule: "delivery" }),
  /** GET /food/delivery/earnings - earnings summary for Pocket/requests page */
  getEarnings: (params) =>
    apiClient.get("/food/delivery/earnings", {
      params: params ?? {},
      contextModule: "delivery",
    }),
  /** Earning Addons (Hotspots/Bonus) */
  getActiveEarningAddons: () =>
    apiClient.get("/food/delivery/earning-addons/active", { contextModule: "delivery" }),
  /** GET /food/delivery/trip-history - completed/cancelled/pending trips for delivery partner */
  getTripHistory: (params) =>
    apiClient.get("/food/delivery/trip-history", {
      params: params ?? {},
      contextModule: "delivery",
    }),
  /** GET /food/delivery/pocket-details - single-call week details (trips + transactions) */
  getPocketDetails: (params) =>
    apiClient.get("/food/delivery/pocket-details", {
      params: params ?? {},
      contextModule: "delivery",
    }),
  /** GET /food/delivery/emergency-help - admin-set emergency numbers for delivery partner */
  getEmergencyHelp: () =>
    apiClient.get("/food/delivery/emergency-help", {
      contextModule: "delivery",
    }),
  /** GET /food/delivery/cash-limit - admin-set cash limit for delivery partner */
  getCashLimit: () =>
    apiClient.get("/food/delivery/cash-limit", {
      contextModule: "delivery",
    }),
  /** Wallet transactions - from wallet response (no separate backend endpoint) */
  getWalletTransactions: (params) =>
    apiClient.get("/food/delivery/wallet", { params: params ?? {}, contextModule: "delivery" }).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: {
          transactions: res?.data?.data?.wallet?.transactions ?? [],
        },
      },
    })),
  /** Zone discovery */
  getZonesInRadius: (lat, lng, radiusKm = 10) =>
    apiClient.get("/food/zones/nearby", {
      params: { lat, lng, radius: radiusKm },
      contextModule: "delivery",
    }),
};

export const userAPI = {
  /** Get current user profile (Bearer USER). */
  getProfile: () =>
    getUserMeOnce().then((res) => {
      const user =
        res?.data?.data?.user ??
        res?.data?.user ??
        res?.data?.data ??
        res?.data;
      return { ...res, data: { ...res.data, data: { user } } };
    }),
  /** PATCH /food/user/profile (Bearer USER) */
  updateProfile: (body) =>
    apiClient.patch("/food/user/profile", body ?? {}, { contextModule: "user" }),
  /** Upload and set user profile image (multipart). Field name: file */
  uploadProfileImage: (file) => {
    if (!file) return Promise.reject(new Error("File is required"));
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/food/user/profile/profile-image", formData, {
      contextModule: "user",
    });
  },
  /** GET /food/user/wallet (Bearer USER). Deduped + short-cached. */
  getWallet: (() => {
    let inFlight = null;
    let cached = null;
    let cacheTime = 0;
    const CACHE_MS = 3000;
    return () => {
      const now = Date.now();
      if (cached && now - cacheTime < CACHE_MS) return Promise.resolve(cached);
      if (!inFlight) {
        inFlight = apiClient
          .get("/food/user/wallet", { contextModule: "user" })
          .then((res) => {
            cached = res;
            cacheTime = Date.now();
            return res;
          })
          .finally(() => {
            inFlight = null;
          });
      }
      return inFlight;
    };
  })(),
  /** GET /food/user/referrals/stats (Bearer USER) */
  getReferralStats: () => apiClient.get("/food/user/referrals/stats", { contextModule: "user" }),
  /** POST /food/user/wallet/topup/order (Bearer USER). Body: { amount } */
  createWalletTopupOrder: (amount) =>
    apiClient.post(
      "/food/user/wallet/topup/order",
      { amount: Number(amount) },
      { contextModule: "user" },
    ),
  /** POST /food/user/wallet/topup/verify (Bearer USER) */
  verifyWalletTopupPayment: (body) =>
    apiClient.post("/food/user/wallet/topup/verify", body ?? {}, {
      contextModule: "user",
    }),
  /** GET /food/user/addresses (Bearer USER). Deduped + short-cached. */
  getAddresses: (() => {
    let inFlight = null;
    let cached = null;
    let cacheTime = 0;
    const CACHE_MS = 3000;
    return () => {
      const now = Date.now();
      if (cached && now - cacheTime < CACHE_MS) return Promise.resolve(cached);
      if (!inFlight) {
        inFlight = apiClient
          .get("/food/user/addresses", { contextModule: "user" })
          .then((res) => {
            cached = res;
            cacheTime = Date.now();
            return res;
          })
          .finally(() => {
            inFlight = null;
          });
      }
      return inFlight;
    };
  })(),
  /** POST /food/user/addresses (Bearer USER) */
  addAddress: (body) => apiClient.post("/food/user/addresses", body ?? {}, { contextModule: "user" }),
  /** PATCH /food/user/addresses/:id (Bearer USER) */
  updateAddress: (id, body) =>
    apiClient.patch(`/food/user/addresses/${String(id)}`, body ?? {}, { contextModule: "user" }),
  /** DELETE /food/user/addresses/:id (Bearer USER) */
  deleteAddress: (id) =>
    apiClient.delete(`/food/user/addresses/${String(id)}`, { contextModule: "user" }),
  /** PATCH /food/user/addresses/:id/default (Bearer USER) */
  setDefaultAddress: (id) =>
    apiClient.patch(`/food/user/addresses/${String(id)}/default`, {}, { contextModule: "user" }),
  /** POST /food/user/safety-emergency-reports (Bearer USER) */
  createSafetyEmergencyReport: (message) =>
    apiClient.post(
      "/food/user/safety-emergency-reports",
      { message: String(message || "") },
      { contextModule: "user" },
    ),
  /** GET /food/user/safety-emergency-reports (Bearer USER) */
  getMySafetyEmergencyReports: (params) =>
    apiClient.get("/food/user/safety-emergency-reports", {
      params: params ?? {},
      contextModule: "user",
    }),
  /**
   * Legacy UI compatibility: update "current user location".
   * We already persist the user's selected location in localStorage in the UI.
   * Keep this as a no-op success so existing flows don't break.
   */
  updateLocation: (_payload) =>
    Promise.resolve({ data: { success: true, message: "Location saved (client)", data: null } }),
};
export const locationAPI = createStubAPI();
export const zoneAPI = {
  /** Public: detect active service zone for a lat/lng point. */
  detectZone: (lat, lng) =>
    apiClient.get("/food/zones/detect", {
      params: { lat, lng },
    }),
  /** Public: list active zones (for onboarding dropdowns). */
  getPublicZones: (params = {}, config = {}) =>
    apiClient.get("/food/zones/public", { params: params ?? {}, ...config }),
};
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
/** Order API (user app – Bearer USER token). Minimal calls: single create/verify, list/details cached by caller. */
export const orderAPI = {
  calculateOrder: (payload) =>
    apiClient.post("/food/orders/calculate", payload ?? {}, { contextModule: "user" }),
  createOrder: (payload) =>
    apiClient.post("/food/orders", payload ?? {}, { contextModule: "user" }),
  verifyPayment: (body) =>
    apiClient.post("/food/orders/verify-payment", body ?? {}, { contextModule: "user" }),
  getOrders: (params = {}) =>
    apiClient.get("/food/orders", { params: { limit: 20, page: 1, ...params }, contextModule: "user" }),
  getOrderDetails: (orderId) =>
    apiClient.get(`/food/orders/${String(orderId)}`, { contextModule: "user" }),
  cancelOrder: (orderId, body = {}) =>
    apiClient.patch(`/food/orders/${String(orderId)}/cancel`, body ?? {}, { contextModule: "user" }),
};

const DINING_BOOKINGS_STORAGE_KEY = "food_dining_bookings_v1";

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getStoredBookings = () => {
  if (typeof localStorage === "undefined") return [];
  const parsed = safeJsonParse(
    localStorage.getItem(DINING_BOOKINGS_STORAGE_KEY) || "[]",
    [],
  );
  return Array.isArray(parsed) ? parsed : [];
};

const saveStoredBookings = (bookings) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    DINING_BOOKINGS_STORAGE_KEY,
    JSON.stringify(Array.isArray(bookings) ? bookings : []),
  );
};

const getStoredModuleUser = (module) => {
  if (typeof localStorage === "undefined") return null;
  const parsed = safeJsonParse(localStorage.getItem(`${module}_user`) || "null", null);
  return parsed && typeof parsed === "object" ? parsed : null;
};

const normalizeName = (restaurant) =>
  restaurant?.name || restaurant?.restaurantName || "Restaurant";

const normalizeRestaurantShape = (restaurant) => {
  if (!restaurant || typeof restaurant !== "object") return null;
  return {
    _id: restaurant?._id || restaurant?.id || null,
    id: restaurant?.id || restaurant?._id || null,
    slug: restaurant?.slug || "",
    name: normalizeName(restaurant),
    restaurantName: restaurant?.restaurantName || normalizeName(restaurant),
    profileImage: restaurant?.profileImage || null,
    image:
      restaurant?.image ||
      restaurant?.profileImage?.url ||
      (typeof restaurant?.profileImage === "string" ? restaurant.profileImage : ""),
    location: restaurant?.location || null,
  };
};

const buildLocalBookingId = () => `dbook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const buildDisplayBookingId = () => `TB${Date.now().toString().slice(-8)}`;

const getCurrentUserForBookings = async () => {
  const storedUser = getStoredModuleUser("user");
  if (storedUser) return storedUser;

  try {
    const me = await getUserMeOnce();
    return (
      me?.data?.data?.user ||
      me?.data?.user ||
      me?.data?.data ||
      null
    );
  } catch {
    return null;
  }
};

const normalizeBookingUser = (candidate) => {
  if (!candidate || typeof candidate !== "object") return null;
  const name = String(candidate?.name || candidate?.fullName || "").trim();
  const phone = String(candidate?.phone || candidate?.mobile || candidate?.phoneNumber || "").trim();
  const email = String(candidate?.email || "").trim();

  return {
    _id: candidate?._id || candidate?.id || null,
    id: candidate?.id || candidate?._id || null,
    name,
    phone,
    email,
  };
};

const byLatest = (a, b) =>
  new Date(b?.createdAt || b?.date || 0).getTime() -
  new Date(a?.createdAt || a?.date || 0).getTime();

export const diningAPI = {
  getCategories: (params = {}) =>
    apiClient.get("/food/dining/categories/public", { params }),
  getRestaurants: (params = {}) =>
    apiClient.get("/food/dining/restaurants/public", { params }),
  getHeroBanners: () =>
    apiClient.get("/food/hero-banners/dining/public"),
  getRestaurantBySlug: (slug) =>
    apiClient.get(`/food/restaurant/restaurants/${String(slug)}`),
  getOfferBanners: () =>
    Promise.resolve({ data: { success: true, data: [] } }),
  getStories: () =>
    Promise.resolve({ data: { success: true, data: [] } }),
  getBankOffers: () =>
    Promise.resolve({ data: { success: true, data: [] } }),
  getBookings: async () => {
    const bookings = getStoredBookings();
    const user = await getCurrentUserForBookings();

    const userId = user?._id || user?.id || null;
    const userPhone = String(user?.phone || "").trim();
    const userEmail = String(user?.email || "").trim().toLowerCase();

    const filtered = bookings
      .filter((booking) => {
        if (userId) {
          return (
            String(booking?.userId || "") === String(userId) ||
            String(booking?.user?._id || booking?.user?.id || "") === String(userId)
          );
        }

        if (userPhone) {
          return String(booking?.user?.phone || "").trim() === userPhone;
        }

        if (userEmail) {
          return String(booking?.user?.email || "").trim().toLowerCase() === userEmail;
        }

        return false;
      })
      .sort(byLatest);

    return Promise.resolve({ data: { success: true, data: filtered } });
  },
  getRestaurantBookings: (restaurantId) => {
    const id = String(restaurantId || "").trim();
    const bookings = getStoredBookings();

    const filtered = bookings
      .filter((booking) => {
        if (!id) return false;
        return (
          String(booking?.restaurantId || "") === id ||
          String(
            booking?.restaurant?._id ||
              booking?.restaurant?.id ||
              booking?.restaurant?.restaurantId ||
              booking?.restaurant?.restaurant?._id ||
              booking?.restaurant?.restaurant?.id ||
              "",
          ) === id
        );
      })
      .sort(byLatest);

    return Promise.resolve({ data: { success: true, data: filtered } });
  },
  updateBookingStatusRestaurant: (bookingId, status) => {
    const id = String(bookingId || "").trim();
    const nextStatus = String(status || "").trim().toLowerCase();
    const bookings = getStoredBookings();

    const next = bookings.map((booking) => {
      const bookingKey = String(booking?._id || booking?.id || "");
      if (bookingKey !== id) return booking;
      return {
        ...booking,
        status: nextStatus || booking?.status || "confirmed",
        updatedAt: new Date().toISOString(),
      };
    });

    saveStoredBookings(next);
    const updated = next.find((booking) => String(booking?._id || booking?.id || "") === id) || null;

    return Promise.resolve({ data: { success: Boolean(updated), data: updated } });
  },
  createReview: (payload = {}) => {
    const bookingId = String(payload?.bookingId || "").trim();
    if (!bookingId) {
      return Promise.resolve({
        data: { success: false, message: "bookingId is required", data: null },
      });
    }

    const bookings = getStoredBookings();
    const next = bookings.map((booking) => {
      const bookingKey = String(booking?._id || booking?.id || "");
      if (bookingKey !== bookingId) return booking;
      return {
        ...booking,
        review: {
          rating: Number(payload?.rating || 0),
          comment: String(payload?.comment || "").trim(),
          createdAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    });

    saveStoredBookings(next);
    const updated = next.find((booking) => String(booking?._id || booking?.id || "") === bookingId) || null;

    return Promise.resolve({ data: { success: Boolean(updated), data: updated } });
  },
  createBooking: async (payload = {}) => {
    const restaurantId = String(
      payload?.restaurant ||
        payload?.restaurantId ||
        payload?.restaurantRef?._id ||
        payload?.restaurantRef?.id ||
        payload?.restaurantRef?.restaurant?._id ||
        payload?.restaurantRef?.restaurant?.id ||
        payload?.restaurant?._id ||
        payload?.restaurant?.id ||
        "",
    ).trim();

    if (!restaurantId) {
      return Promise.resolve({
        data: {
          success: false,
          message: "Restaurant is required",
          data: null,
        },
      });
    }

    let restaurantData =
      normalizeRestaurantShape(payload?.restaurantRef) ||
      normalizeRestaurantShape(payload?.restaurant?.restaurant) ||
      normalizeRestaurantShape(payload?.restaurant);
    if (!restaurantData) {
      try {
        const restaurantRes = await apiClient.get(
          `/food/restaurant/restaurants/${String(restaurantId)}`,
        );
        const rawRestaurant =
          restaurantRes?.data?.data?.restaurant || restaurantRes?.data?.data || null;
        restaurantData = normalizeRestaurantShape(rawRestaurant);
      } catch {
        restaurantData = {
          _id: restaurantId,
          id: restaurantId,
          name: "Restaurant",
          restaurantName: "Restaurant",
          profileImage: null,
          image: "",
          location: null,
          slug: "",
        };
      }
    }

    const payloadUser = normalizeBookingUser(payload?.userRef || payload?.user);
    const resolvedUser = payloadUser || normalizeBookingUser(await getCurrentUserForBookings()) || null;
    const nowIso = new Date().toISOString();
    const localBookingId = buildLocalBookingId();

    const booking = {
      _id: localBookingId,
      id: localBookingId,
      bookingId: buildDisplayBookingId(),
      restaurantId,
      restaurant: restaurantData,
      userId: resolvedUser?._id || resolvedUser?.id || null,
      user: {
        _id: resolvedUser?._id || resolvedUser?.id || null,
        id: resolvedUser?.id || resolvedUser?._id || null,
        name: resolvedUser?.name || "Guest",
        phone: resolvedUser?.phone || "",
        email: resolvedUser?.email || "",
      },
      guests: Math.max(1, Number(payload?.guests) || 1),
      date: new Date(payload?.date || nowIso).toISOString(),
      timeSlot: String(payload?.timeSlot || "").trim(),
      specialRequest: String(payload?.specialRequest || "").trim(),
      status: "confirmed",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const bookings = getStoredBookings();
    const next = [booking, ...bookings].sort(byLatest);
    saveStoredBookings(next);

    return Promise.resolve({
      data: {
        success: true,
        message: "Booking created successfully",
        data: booking,
      },
    });
  },
};
export const heroBannerAPI = createStubAPI();
export const publicAPI = createStubAPI();
