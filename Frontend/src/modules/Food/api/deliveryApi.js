import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export delivery API helper functions
export const deliveryAPI = {
  // Delivery Authentication
  sendOTP: (phone, purpose = "login") => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.AUTH.SEND_OTP, {
      phone,
      purpose,
    });
  },
  verifyOTP: (phone, otp, purpose = "login", name = null) => {
    const payload = { phone, otp, purpose };
    // Only include name if it's provided and is a string
    if (name && typeof name === "string" && name.trim()) {
      payload.name = name.trim();
    }
    return apiClient.post(API_ENDPOINTS.DELIVERY.AUTH.VERIFY_OTP, payload);
  },
  refreshToken: () => {
    const refreshToken = localStorage.getItem("delivery_refreshToken");
    const config =
      refreshToken && typeof refreshToken === "string"
        ? { headers: { "x-refresh-token": refreshToken } }
        : {};

    return apiClient.post(API_ENDPOINTS.DELIVERY.AUTH.REFRESH_TOKEN, {}, config);
  },
  logout: () => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.AUTH.LOGOUT);
  },
  getCurrentDelivery: () => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.AUTH.ME);
  },
  saveFcmToken: (token, platform = "web") => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.AUTH.FCM_TOKEN, {
      token,
      platform,
    });
  },
  removeFcmToken: (payload = {}) => {
    return apiClient.delete(API_ENDPOINTS.DELIVERY.AUTH.FCM_TOKEN, {
      data: payload,
    });
  },

  // Dashboard
  getDashboard: () => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.DASHBOARD);
  },

  // Wallet
  getWallet: () => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.WALLET);
  },
  getWalletBalance: () => {
    // Backward compatibility - use getWallet instead
    return apiClient.get(API_ENDPOINTS.DELIVERY.WALLET);
  },
  getWalletTransactions: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.WALLET_TRANSACTIONS, {
      params,
    });
  },
  getWalletStats: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.WALLET_STATS, { params });
  },
  createWithdrawalRequest: (data) => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.WALLET_WITHDRAW, data);
  },
  addEarning: (data) => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.WALLET_EARNINGS, data);
  },
  collectPayment: (data) => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.WALLET_COLLECT_PAYMENT, data);
  },
  claimJoiningBonus: () => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.CLAIM_JOINING_BONUS);
  },
  createDepositOrder: (amount) => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.WALLET_DEPOSIT_CREATE_ORDER, {
      amount,
    });
  },
  verifyDepositPayment: (data) => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.WALLET_DEPOSIT_VERIFY, data);
  },
  getOrderStats: (period = "all") => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.ORDER_STATS, {
      params: { period },
    });
  },

  // Get emergency help numbers
  getEmergencyHelp: () => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.EMERGENCY_HELP);
  },

  // Support Tickets
  getSupportTickets: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.SUPPORT_TICKETS, { params });
  },

  getSupportTicketById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.DELIVERY.SUPPORT_TICKET_BY_ID.replace(":id", id),
    );
  },

  createSupportTicket: (data) => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.SUPPORT_TICKETS, data);
  },

  // Get delivery profile
  getProfile: () => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.PROFILE);
  },

  // Update delivery profile
  updateProfile: (data) => {
    return apiClient.put(API_ENDPOINTS.DELIVERY.PROFILE, data);
  },

  // Get orders
  getOrders: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.ORDERS, { params });
  },
  getOrderDetails: (orderId) => {
    return apiClient.get(
      API_ENDPOINTS.DELIVERY.ORDER_BY_ID.replace(":orderId", orderId),
    );
  },
  acceptOrder: (orderId, currentLocation = {}) => {
    const payload = {};
    if (currentLocation.lat !== undefined && currentLocation.lat !== null) {
      payload.currentLat = currentLocation.lat;
    }
    if (currentLocation.lng !== undefined && currentLocation.lng !== null) {
      payload.currentLng = currentLocation.lng;
    }
    return apiClient.patch(
      API_ENDPOINTS.DELIVERY.ORDER_ACCEPT.replace(":orderId", orderId),
      payload,
    );
  },
  confirmReachedPickup: (orderId) => {
    return apiClient.patch(
      API_ENDPOINTS.DELIVERY.ORDER_REACHED_PICKUP.replace(":orderId", orderId),
    );
  },
  confirmOrderId: (
    orderId,
    confirmedOrderId,
    currentLocation = {},
    additionalData = {},
  ) => {
    return apiClient.patch(
      API_ENDPOINTS.DELIVERY.ORDER_CONFIRM_ID.replace(":orderId", orderId),
      {
        confirmedOrderId,
        currentLat: currentLocation.lat,
        currentLng: currentLocation.lng,
        ...additionalData,
      },
    );
  },
  confirmReachedDrop: (orderId) => {
    return apiClient.patch(
      API_ENDPOINTS.DELIVERY.ORDER_REACHED_DROP.replace(":orderId", orderId),
    );
  },
  verifyDropOtp: (orderId, otp) => {
    return apiClient.patch(
      API_ENDPOINTS.DELIVERY.ORDER_VERIFY_DROP_OTP.replace(":orderId", orderId),
      { otp },
    );
  },
  completeDelivery: (orderId, rating = null, review = "") => {
    return apiClient.patch(
      API_ENDPOINTS.DELIVERY.ORDER_COMPLETE_DELIVERY.replace(
        ":orderId",
        orderId,
      ),
      {
        rating,
        review,
      },
    );
  },

  // Get trip history
  getTripHistory: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.TRIP_HISTORY, { params });
  },

  // Get earnings
  getEarnings: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.EARNINGS, { params });
  },

  // Get active earning addon offers (disabled until backend is ready)
  getActiveEarningAddons: () => {
    const endpoint = API_ENDPOINTS.DELIVERY.EARNINGS_ACTIVE_OFFERS;
    // Temporarily return a resolved stub response to avoid noisy logs and failed calls
    return Promise.resolve({
      data: { success: false, data: { activeOffers: [] }, endpoint, disabled: true },
    });
  },

  // Update location
  updateLocation: (latitude, longitude, isOnline = null, meta = {}) => {
    const payload = {
      latitude,
      longitude,
    };
    if (typeof isOnline === "boolean") {
      payload.isOnline = isOnline;
    }
    if (meta && typeof meta === "object") {
      if (typeof meta.heading === "number") payload.heading = meta.heading;
      if (typeof meta.speed === "number") payload.speed = meta.speed;
      if (typeof meta.accuracy === "number") payload.accuracy = meta.accuracy;
    }
    return apiClient.post(API_ENDPOINTS.DELIVERY.LOCATION, payload);
  },

  // Update online status
  updateOnlineStatus: (isOnline) => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.LOCATION, {
      isOnline,
    });
  },

  // Signup
  submitSignupDetails: (data) => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.SIGNUP.DETAILS, data);
  },
  submitSignupDocuments: (data) => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.SIGNUP.DOCUMENTS, data);
  },

  // Reverify (resubmit for approval)
  reverify: () => {
    return apiClient.post(API_ENDPOINTS.DELIVERY.REVERIFY);
  },

  // Get zones within radius (for delivery boy to see nearby zones)
  getZonesInRadius: (latitude, longitude, radius = 70) => {
    return apiClient.get(API_ENDPOINTS.DELIVERY.ZONES_IN_RADIUS, {
      params: { latitude, longitude, radius },
    });
  },
};

export default deliveryAPI;
