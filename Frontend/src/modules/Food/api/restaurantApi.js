import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export restaurant API helper functions
export const restaurantAPI = {
  // Restaurant Authentication
  sendOTP: (phone = null, purpose = "login", email = null) => {
    const payload = { purpose };
    if (phone) payload.phone = phone;
    if (email) payload.email = email;
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.SEND_OTP, payload);
  },

  verifyOTP: (
    phone = null,
    otp,
    purpose = "login",
    name = null,
    email = null,
    password = null,
  ) => {
    const payload = {
      otp,
      purpose,
    };
    if (phone != null) payload.phone = phone;
    if (email != null) payload.email = email;
    if (name != null) payload.name = name;
    if (password != null) payload.password = password;
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.VERIFY_OTP, payload);
  },

  register: (
    name,
    email,
    password,
    phone = null,
    ownerName = null,
    ownerEmail = null,
    ownerPhone = null,
  ) => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.REGISTER, {
      name,
      email,
      password,
      phone,
      ownerName,
      ownerEmail,
      ownerPhone,
    });
  },

  login: (email, password) => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.LOGIN, {
      email,
      password,
    });
  },

  firebaseGoogleLogin: (idToken) => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.FIREBASE_GOOGLE_LOGIN, {
      idToken,
    });
  },

  refreshToken: () => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.REFRESH_TOKEN);
  },

  logout: () => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.LOGOUT);
  },

  getCurrentRestaurant: () => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.AUTH.ME);
  },
  saveFcmToken: (token, platform = "web") => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.FCM_TOKEN, {
      token,
      platform,
    });
  },
  removeFcmToken: (payload = {}) => {
    return apiClient.delete(API_ENDPOINTS.RESTAURANT.AUTH.FCM_TOKEN, {
      data: payload,
    });
  },

  reverify: () => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.REVERIFY);
  },

  resetPassword: (email, otp, newPassword) => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.AUTH.RESET_PASSWORD, {
      email,
      otp,
      newPassword,
    });
  },

  // Get restaurant profile
  getProfile: () => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.PROFILE);
  },

  // Update restaurant profile
  updateProfile: (data) => {
    return apiClient.put(API_ENDPOINTS.RESTAURANT.PROFILE, data);
  },

  // Delete restaurant account
  deleteAccount: () => {
    return apiClient.delete(API_ENDPOINTS.RESTAURANT.PROFILE);
  },

  // Update delivery status (isAcceptingOrders)
  updateDeliveryStatus: (isAcceptingOrders) => {
    return apiClient.put(API_ENDPOINTS.RESTAURANT.DELIVERY_STATUS, {
      isAcceptingOrders,
    });
  },

  // Upload profile image
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(
      `${API_ENDPOINTS.RESTAURANT.PROFILE}/image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  },

  // Upload menu image
  uploadMenuImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(
      `${API_ENDPOINTS.RESTAURANT.PROFILE}/menu-image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  },

  // Staff Management
  addStaff: (data) => {
    // If data is FormData, set appropriate headers
    const config =
      data instanceof FormData
        ? {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
        : {};
    return apiClient.post(API_ENDPOINTS.RESTAURANT.STAFF, data, config);
  },
  getStaff: (role) => {
    const url = role
      ? `${API_ENDPOINTS.RESTAURANT.STAFF}?role=${role}`
      : API_ENDPOINTS.RESTAURANT.STAFF;
    return apiClient.get(url);
  },
  getStaffById: (id) => {
    return apiClient.get(`${API_ENDPOINTS.RESTAURANT.STAFF}/${id}`);
  },
  updateStaff: (id, data) => {
    return apiClient.put(`${API_ENDPOINTS.RESTAURANT.STAFF}/${id}`, data);
  },
  deleteStaff: (id) => {
    return apiClient.delete(`${API_ENDPOINTS.RESTAURANT.STAFF}/${id}`);
  },

  // Menu operations
  getMenu: () => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.MENU);
  },
  updateMenu: (menuData) => {
    return apiClient.put(API_ENDPOINTS.RESTAURANT.MENU, menuData);
  },
  addSection: (name) => {
    return apiClient.post(`${API_ENDPOINTS.RESTAURANT.MENU}/section`, { name });
  },
  addItemToSection: (sectionId, item) => {
    return apiClient.post(`${API_ENDPOINTS.RESTAURANT.MENU}/section/item`, {
      sectionId,
      item,
    });
  },
  addSubsectionToSection: (sectionId, name) => {
    return apiClient.post(
      `${API_ENDPOINTS.RESTAURANT.MENU}/section/subsection`,
      { sectionId, name },
    );
  },
  addItemToSubsection: (sectionId, subsectionId, item) => {
    return apiClient.post(`${API_ENDPOINTS.RESTAURANT.MENU}/subsection/item`, {
      sectionId,
      subsectionId,
      item,
    });
  },
  getMenuByRestaurantId: (restaurantId, options = {}) => {
    const params = { ...(options.params || {}) };
    if (options.noCache) {
      params._ts = Date.now();
    }
    const config = Object.keys(params).length > 0 ? { params } : {};
    return apiClient.get(
      API_ENDPOINTS.RESTAURANT.MENU_BY_RESTAURANT_ID.replace(
        ":id",
        restaurantId,
      ),
      config,
    );
  },

  // Get orders
  getOrders: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.ORDERS, { params });
  },

  // Get order by ID
  getOrderById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.RESTAURANT.ORDER_BY_ID.replace(":id", id),
    );
  },

  // Accept order
  acceptOrder: (id, preparationTime = null) => {
    return apiClient.patch(
      API_ENDPOINTS.RESTAURANT.ORDER_ACCEPT.replace(":id", id),
      {
        preparationTime,
      },
    );
  },

  // Reject order
  rejectOrder: (id, reason = "") => {
    return apiClient.patch(
      API_ENDPOINTS.RESTAURANT.ORDER_REJECT.replace(":id", id),
      {
        reason,
      },
    );
  },

  // Mark order as preparing
  markOrderPreparing: (id, options = {}) => {
    const url = API_ENDPOINTS.RESTAURANT.ORDER_PREPARING.replace(":id", id);
    // Add resend query parameter if provided
    if (options.resend) {
      return apiClient.patch(`${url}?resend=true`);
    }
    return apiClient.patch(url);
  },

  // Mark order as ready
  markOrderReady: (id) => {
    return apiClient.patch(
      API_ENDPOINTS.RESTAURANT.ORDER_READY.replace(":id", id),
    );
  },

  // Resend delivery notification for unassigned order
  resendDeliveryNotification: (id) => {
    return apiClient.post(
      API_ENDPOINTS.RESTAURANT.ORDER_RESEND_DELIVERY_NOTIFICATION.replace(
        ":id",
        id,
      ),
    );
  },

  // Get wallet
  getWallet: () => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.WALLET);
  },
  getWalletTransactions: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.WALLET_TRANSACTIONS, {
      params,
    });
  },
  getWalletStats: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.WALLET_STATS, { params });
  },
  // Withdrawal
  createWithdrawalRequest: (amount) => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.WITHDRAWAL_REQUEST, {
      amount,
    });
  },
  getWithdrawalRequests: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.WITHDRAWAL_REQUESTS, {
      params,
    });
  },

  // Get analytics
  getAnalytics: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.ANALYTICS, { params });
  },

  // Get all restaurants (for user module)
  getRestaurants: (params = {}, options = {}) => {
    const nextParams = { ...params };
    if (options.noCache && !nextParams._ts) {
      nextParams._ts = Date.now();
    }
    return apiClient.get(API_ENDPOINTS.RESTAURANT.LIST, { params: nextParams });
  },

  // Get restaurants with dishes under ?250
  getRestaurantsUnder250: (zoneId) => {
    const params = zoneId ? { zoneId } : {};
    return apiClient.get(API_ENDPOINTS.RESTAURANT.UNDER_250, { params });
  },

  // Get all public dishes (flattened menu items from sections + subsections)
  getPublicDishes: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.DISHES_PUBLIC, { params });
  },

  // Get restaurant by ID or slug
  getRestaurantById: (id) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.BY_ID.replace(":id", id));
  },
  // Get public outlet timings by restaurant MongoDB ID
  getOutletTimingsByRestaurantId: (restaurantId) => {
    return apiClient.get(`/restaurant/${restaurantId}/outlet-timings`);
  },
  // Get coupons for item (public - for user cart)
  getCouponsByItemIdPublic: (restaurantId, itemId) => {
    return apiClient.get(
      API_ENDPOINTS.RESTAURANT.COUPONS_BY_ITEM_ID_PUBLIC.replace(
        ":restaurantId",
        restaurantId,
      ).replace(":itemId", itemId),
    );
  },
  // Get public offers (for user offers page)
  getPublicOffers: () => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.OFFERS_PUBLIC);
  },

  // Menu item scheduling operations
  scheduleItemAvailability: (scheduleData) => {
    return apiClient.post(
      API_ENDPOINTS.RESTAURANT.MENU_ITEM_SCHEDULE,
      scheduleData,
    );
  },
  cancelScheduledAvailability: (scheduleId) => {
    return apiClient.delete(
      API_ENDPOINTS.RESTAURANT.MENU_ITEM_SCHEDULE_BY_ID.replace(
        ":scheduleId",
        scheduleId,
      ),
    );
  },
  getItemSchedule: (sectionId, itemId) => {
    return apiClient.get(
      API_ENDPOINTS.RESTAURANT.MENU_ITEM_SCHEDULE_BY_ITEM.replace(
        ":sectionId",
        sectionId,
      ).replace(":itemId", itemId),
    );
  },

  // Category operations (for restaurant module)
  getCategories: () => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.CATEGORIES);
  },
  getAllCategories: () => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.CATEGORIES_ALL);
  },
  createCategory: (categoryData) => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.CATEGORIES, categoryData);
  },
  updateCategory: (id, categoryData) => {
    return apiClient.put(
      API_ENDPOINTS.RESTAURANT.CATEGORY_BY_ID.replace(":id", id),
      categoryData,
    );
  },
  deleteCategory: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.RESTAURANT.CATEGORY_BY_ID.replace(":id", id),
    );
  },
  reorderCategories: (categories) => {
    return apiClient.put(API_ENDPOINTS.RESTAURANT.CATEGORIES_REORDER, {
      categories,
    });
  },

  // Inventory operations (for restaurant module)
  getInventory: () => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.INVENTORY);
  },
  updateInventory: (inventoryData) => {
    return apiClient.put(API_ENDPOINTS.RESTAURANT.INVENTORY, inventoryData);
  },
  getInventoryByRestaurantId: (restaurantId) => {
    return apiClient.get(
      API_ENDPOINTS.RESTAURANT.INVENTORY_BY_RESTAURANT_ID.replace(
        ":id",
        restaurantId,
      ),
    );
  },

  // Offer operations (for restaurant module)
  createOffer: (offerData) => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.OFFERS, offerData);
  },
  getOffers: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.OFFERS, { params });
  },
  getOfferById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.RESTAURANT.OFFER_BY_ID.replace(":id", id),
    );
  },
  updateOfferStatus: (id, status) => {
    return apiClient.put(
      API_ENDPOINTS.RESTAURANT.OFFER_STATUS.replace(":id", id),
      { status },
    );
  },
  deleteOffer: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.RESTAURANT.OFFER_BY_ID.replace(":id", id),
    );
  },
  getCouponsByItemId: (itemId) => {
    return apiClient.get(
      API_ENDPOINTS.RESTAURANT.COUPONS_BY_ITEM_ID.replace(":itemId", itemId),
    );
  },

  // Add-on operations
  addAddon: (addonData) => {
    return apiClient.post(API_ENDPOINTS.RESTAURANT.ADDON, addonData);
  },
  getAddons: () => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.ADDONS);
  },
  updateAddon: (id, addonData) => {
    return apiClient.put(
      API_ENDPOINTS.RESTAURANT.ADDON_BY_ID.replace(":id", id),
      addonData,
    );
  },
  deleteAddon: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.RESTAURANT.ADDON_BY_ID.replace(":id", id),
    );
  },
  getAddonsByRestaurantId: (restaurantId) => {
    return apiClient.get(
      API_ENDPOINTS.RESTAURANT.ADDONS_BY_RESTAURANT_ID.replace(
        ":id",
        restaurantId,
      ),
    );
  },

  // Finance operations (for restaurant module)
  getFinance: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.FINANCE, { params });
  },

  // Complaint operations
  getComplaints: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.RESTAURANT.COMPLAINTS, { params });
  },
  getComplaintById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.RESTAURANT.COMPLAINT_BY_ID.replace(":id", id),
    );
  },
  respondToComplaint: (id, response) => {
    return apiClient.put(
      API_ENDPOINTS.RESTAURANT.COMPLAINT_RESPOND.replace(":id", id),
      { response },
    );
  },
};

export default restaurantAPI;
