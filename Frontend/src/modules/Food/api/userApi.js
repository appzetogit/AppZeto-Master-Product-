import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export user API helper functions
export const userAPI = {
  // Get user profile
  getProfile: () => {
    return apiClient.get(API_ENDPOINTS.USER.PROFILE);
  },

  // Update user profile
  updateProfile: (data) => {
    return apiClient.put(API_ENDPOINTS.USER.PROFILE, data);
  },

  // Save/update FCM token for push notifications
  saveFcmToken: (token, options = {}) => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    const isLikelyMobile = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua);
    const isFlutterWebView = /\bwv\b|Flutter/i.test(ua);
    const inferredChannel = isFlutterWebView || isLikelyMobile ? "mobile" : "web";
    const channel = options.channel || inferredChannel;
    const platform = options.platform || (channel === "mobile" ? "android" : "web");

    return apiClient.post("/user/fcm-token", {
      token,
      channel,
      platform,
      ...(options.deviceId ? { deviceId: options.deviceId } : {}),
    });
  },

  // Remove/deactivate FCM token
  removeFcmToken: (token = null, options = {}) => {
    return apiClient.delete("/user/fcm-token", {
      data: {
        ...(token ? { token } : {}),
        ...(options.channel ? { channel: options.channel } : {}),
        ...(options.platform ? { platform: options.platform } : {}),
      },
    });
  },

  // Upload profile image
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return apiClient.post("/user/profile/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Get user addresses
  getAddresses: () => {
    return apiClient.get(API_ENDPOINTS.USER.ADDRESSES);
  },

  // Add address
  addAddress: (address) => {
    return apiClient.post(API_ENDPOINTS.USER.ADDRESSES, address);
  },

  // Update address
  updateAddress: (addressId, address) => {
    return apiClient.put(
      `${API_ENDPOINTS.USER.ADDRESSES}/${addressId}`,
      address,
    );
  },

  // Delete address
  deleteAddress: (addressId) => {
    return apiClient.delete(`${API_ENDPOINTS.USER.ADDRESSES}/${addressId}`);
  },

  // Get user preferences
  getPreferences: () => {
    return apiClient.get(API_ENDPOINTS.USER.PREFERENCES);
  },

  // Update preferences
  updatePreferences: (preferences) => {
    return apiClient.put(API_ENDPOINTS.USER.PREFERENCES, preferences);
  },

  // Get wallet
  getWallet: () => {
    return apiClient.get(API_ENDPOINTS.USER.WALLET);
  },

  // Get wallet transactions
  getWalletTransactions: (params = {}) => {
    return apiClient.get(`${API_ENDPOINTS.USER.WALLET}/transactions`, {
      params,
    });
  },

  // Create Razorpay order for wallet top-up
  createWalletTopupOrder: (amount) => {
    return apiClient.post(`${API_ENDPOINTS.USER.WALLET}/create-topup-order`, {
      amount,
    });
  },

  // Verify payment and add money to wallet
  verifyWalletTopupPayment: (data) => {
    return apiClient.post(
      `${API_ENDPOINTS.USER.WALLET}/verify-topup-payment`,
      data,
    );
  },

  // Add money to wallet (direct - internal use)
  addMoneyToWallet: (data) => {
    return apiClient.post(`${API_ENDPOINTS.USER.WALLET}/add-money`, data);
  },

  // Get user orders
  getOrders: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ORDER.LIST, { params });
  },

  // Get user location
  getLocation: () => {
    return apiClient.get(API_ENDPOINTS.USER.LOCATION);
  },

  // Update user location
  updateLocation: (locationData) => {
    return apiClient.put(API_ENDPOINTS.USER.LOCATION, locationData);
  },
};

export default userAPI;
