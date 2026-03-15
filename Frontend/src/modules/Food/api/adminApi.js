import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export admin API helper functions
export const adminAPI = {
  // Admin Auth
  signup: (name, email, password, phone = null) => {
    const payload = { name, email, password };
    if (phone) payload.phone = phone;
    return apiClient.post(API_ENDPOINTS.ADMIN.AUTH.SIGNUP, payload);
  },

  signupWithOTP: (name, email, password, otp, phone = null) => {
    const payload = { name, email, password, otp };
    if (phone) payload.phone = phone;
    return apiClient.post(API_ENDPOINTS.ADMIN.AUTH.SIGNUP_OTP, payload);
  },

  login: (email, password) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.AUTH.LOGIN, { email, password });
  },

  logout: () => {
    return apiClient.post(API_ENDPOINTS.ADMIN.AUTH.LOGOUT);
  },

  getCurrentAdmin: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.AUTH.ME);
  },

  // Get admin profile
  getAdminProfile: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.PROFILE);
  },

  // Update admin profile
  updateAdminProfile: (profileData) => {
    return apiClient.put(API_ENDPOINTS.ADMIN.PROFILE, profileData);
  },

  // Change admin password
  changePassword: (currentPassword, newPassword) => {
    return apiClient.put(API_ENDPOINTS.ADMIN.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
  },

  // Get dashboard stats
  getDashboardStats: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DASHBOARD_STATS);
  },

  // Send admin push notification to stored FCM tokens
  sendPushNotification: (payload) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.PUSH_NOTIFICATION_SEND, payload);
  },

  // Get users
  getUsers: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.USERS, { params });
  },

  // Get user by ID
  getUserById: (id) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.USER_BY_ID.replace(":id", id));
  },

  // Update user status
  updateUserStatus: (id, isActive) => {
    return apiClient.put(API_ENDPOINTS.ADMIN.USER_STATUS.replace(":id", id), {
      isActive,
    });
  },

  // Get restaurants
  getRestaurants: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.RESTAURANTS, { params });
  },

  // Create restaurant
  createRestaurant: (data) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.RESTAURANTS, data);
  },

  // Update restaurant details
  updateRestaurant: (id, data) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.RESTAURANT_BY_ID.replace(":id", id),
      data,
    );
  },

  // Get restaurant by ID
  getRestaurantById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.RESTAURANT_BY_ID.replace(":id", id),
    );
  },

  // Get restaurant menu by ID (admin)
  getRestaurantMenuById: (id, options = {}) => {
    const params = { ...(options.params || {}) };
    if (options.noCache) {
      params._ts = Date.now();
    }
    const config = Object.keys(params).length > 0 ? { params } : {};
    return apiClient.get(
      API_ENDPOINTS.ADMIN.RESTAURANT_MENU_BY_ID.replace(":id", id),
      config,
    );
  },

  // Update restaurant menu by ID (admin)
  updateRestaurantMenuById: (id, payload = {}) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.RESTAURANT_MENU_BY_ID.replace(":id", id),
      payload,
    );
  },

  // Get restaurant analytics
  getRestaurantAnalytics: (restaurantId) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.RESTAURANT_ANALYTICS.replace(
        ":restaurantId",
        restaurantId,
      ),
    );
  },

  // Update restaurant status
  updateRestaurantStatus: (id, isActive) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.RESTAURANT_STATUS.replace(":id", id),
      { isActive },
    );
  },

  // Update restaurant location
  updateRestaurantLocation: (id, location) => {
    return apiClient.put(`/admin/restaurants/${id}/location`, { location });
  },

  // Update restaurant dining settings
  updateRestaurantDiningSettings: (id, diningSettings) => {
    return apiClient.put(`/admin/restaurants/${id}/dining-settings`, {
      diningSettings,
    });
  },

  // Get dining categories
  getDiningCategories: () => {
    return apiClient.get("/admin/dining/categories");
  },

  // Get restaurant join requests
  getRestaurantJoinRequests: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.RESTAURANT_REQUESTS, { params });
  },

  // Approve restaurant
  approveRestaurant: (id) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.RESTAURANT_APPROVE.replace(":id", id),
    );
  },

  // Reject restaurant
  rejectRestaurant: (id, reason) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.RESTAURANT_REJECT.replace(":id", id),
      { reason },
    );
  },

  // Delete restaurant
  deleteRestaurant: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.ADMIN.RESTAURANT_DELETE.replace(":id", id),
    );
  },

  // Get all offers (with restaurant and dish details)
  getAllOffers: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.OFFERS, { params });
  },

  // Create coupon offer from admin
  createAdminOffer: (data) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.OFFERS, data);
  },
  updateAdminOfferCartVisibility: (offerId, itemId, showInCart) => {
    return apiClient.patch(
      `/admin/offers/${encodeURIComponent(offerId)}/items/${encodeURIComponent(itemId)}/cart-visibility`,
      { showInCart },
    );
  },

  // Restaurant Commission Management
  getRestaurantCommissions: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.RESTAURANT_COMMISSION, { params });
  },

  getApprovedRestaurants: (params = {}) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.RESTAURANT_COMMISSION_APPROVED_RESTAURANTS,
      { params },
    );
  },

  getRestaurantCommissionById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.RESTAURANT_COMMISSION_BY_ID.replace(":id", id),
    );
  },

  getCommissionByRestaurantId: (restaurantId) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.RESTAURANT_COMMISSION_BY_RESTAURANT_ID.replace(
        ":restaurantId",
        restaurantId,
      ),
    );
  },

  createRestaurantCommission: (data) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.RESTAURANT_COMMISSION, data);
  },

  updateRestaurantCommission: (id, data) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.RESTAURANT_COMMISSION_BY_ID.replace(":id", id),
      data,
    );
  },

  deleteRestaurantCommission: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.ADMIN.RESTAURANT_COMMISSION_BY_ID.replace(":id", id),
    );
  },

  toggleRestaurantCommissionStatus: (id) => {
    return apiClient.patch(
      API_ENDPOINTS.ADMIN.RESTAURANT_COMMISSION_STATUS.replace(":id", id),
    );
  },

  calculateRestaurantCommission: (restaurantId, orderAmount) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.RESTAURANT_COMMISSION_CALCULATE, {
      restaurantId,
      orderAmount,
    });
  },

  // Restaurant Complaint Management
  getRestaurantComplaints: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.RESTAURANT_COMPLAINTS, { params });
  },
  getRestaurantComplaintById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.RESTAURANT_COMPLAINT_BY_ID.replace(":id", id),
    );
  },
  updateRestaurantComplaintStatus: (
    id,
    status,
    adminResponse,
    internalNotes,
  ) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.RESTAURANT_COMPLAINT_STATUS.replace(":id", id),
      {
        status,
        adminResponse,
        internalNotes,
      },
    );
  },
  updateRestaurantComplaintNotes: (id, internalNotes) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.RESTAURANT_COMPLAINT_NOTES.replace(":id", id),
      {
        internalNotes,
      },
    );
  },

  // Get delivery partners
  getDelivery: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY, { params });
  },

  // Get delivery partner join requests
  getDeliveryPartnerJoinRequests: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_PARTNERS_REQUESTS, {
      params,
    });
  },

  // Get delivery partner by ID
  getDeliveryPartnerById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.DELIVERY_PARTNER_BY_ID.replace(":id", id),
    );
  },

  // Approve delivery partner
  approveDeliveryPartner: (id) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.DELIVERY_PARTNER_APPROVE.replace(":id", id),
    );
  },

  // Reject delivery partner
  rejectDeliveryPartner: (id, reason) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.DELIVERY_PARTNER_REJECT.replace(":id", id),
      { reason },
    );
  },

  // Reverify delivery partner
  reverifyDeliveryPartner: (id) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.DELIVERY_PARTNER_REVERIFY.replace(":id", id),
    );
  },

  // Get all delivery partners
  getDeliveryEarnings: (params = {}) => {
    return apiClient.get("/admin/delivery-partners/earnings", { params });
  },

  getDeliveryPartners: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_PARTNERS, { params });
  },

  // Update delivery partner status
  updateDeliveryPartnerStatus: (id, status, isActive = null) => {
    const payload = {};
    if (status) payload.status = status;
    if (isActive !== null) payload.isActive = isActive;
    return apiClient.patch(
      API_ENDPOINTS.ADMIN.DELIVERY_PARTNER_STATUS.replace(":id", id),
      payload,
    );
  },

  // Delete delivery partner
  deleteDeliveryPartner: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.ADMIN.DELIVERY_PARTNER_DELETE.replace(":id", id),
    );
  },

  // Add bonus to delivery partner
  addDeliveryPartnerBonus: (deliveryPartnerId, amount, reference = "") => {
    return apiClient.post(API_ENDPOINTS.ADMIN.DELIVERY_PARTNER_BONUS, {
      deliveryPartnerId,
      amount: parseFloat(amount),
      reference,
    });
  },

  // Get bonus transactions
  getDeliveryPartnerBonusTransactions: (params = {}) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.DELIVERY_PARTNER_BONUS_TRANSACTIONS,
      { params },
    );
  },

  // Get orders
  getOrders: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ORDERS, { params });
  },

  // Accept order (admin)
  acceptOrder: (id) => {
    return apiClient.patch(`/admin/orders/${encodeURIComponent(id)}/accept`);
  },

  // Reject order (admin)
  rejectOrder: (id, reason = "") => {
    return apiClient.patch(`/admin/orders/${encodeURIComponent(id)}/reject`, {
      reason,
    });
  },

  // Delete order (admin)
  deleteOrder: (id) => {
    return apiClient.delete(`/admin/orders/${encodeURIComponent(id)}`);
  },

  // Get orders searching for deliveryman
  getSearchingDeliverymanOrders: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ORDERS_SEARCHING_DELIVERYMAN, {
      params,
    });
  },

  // Get ongoing orders
  getOngoingOrders: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ORDERS_ONGOING, { params });
  },

  // Get transaction report
  getTransactionReport: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ORDERS_TRANSACTION_REPORT, {
      params,
    });
  },

  // Get restaurant report
  getRestaurantReport: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ORDERS_RESTAURANT_REPORT, {
      params,
    });
  },

  // Get refund requests
  getRefundRequests: (params = {}) => {
    return apiClient.get("/api/admin/refund-requests", { params });
  },

  // Process refund (supports both old and new endpoints)
  processRefund: (orderId, data = {}) => {
    // Backend accepts either MongoDB ObjectId (24 chars) or orderId string
    // Note: Don't include /api prefix - apiClient baseURL already includes it
    if (!orderId) {
      return Promise.reject(new Error("Order ID is required"));
    }
    // Use the working endpoint: /admin/refund-requests/:orderId/process
    // apiClient baseURL is already /api, so this becomes /api/admin/refund-requests/:orderId/process
    return apiClient.post(
      `/admin/refund-requests/${encodeURIComponent(orderId)}/process`,
      data,
    );
  },

  // Withdrawal Request Management
  getWithdrawalRequests: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.WITHDRAWAL_REQUESTS, { params });
  },
  approveWithdrawalRequest: (id) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.WITHDRAWAL_APPROVE.replace(":id", id),
    );
  },
  rejectWithdrawalRequest: (id, rejectionReason = "") => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.WITHDRAWAL_REJECT.replace(":id", id),
      { rejectionReason },
    );
  },

  // Get customer wallet report
  getCustomerWalletReport: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.CUSTOMER_WALLET_REPORT, {
      params,
    });
  },

  // Business Settings Management
  getBusinessSettings: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS);
  },

  updateBusinessSettings: (data, files = {}) => {
    const formData = new FormData();

    // Add text fields
    Object.keys(data).forEach((key) => {
      if (key !== "logo" && key !== "favicon") {
        formData.append(key, data[key]);
      }
    });

    // Add files
    if (files.logo) {
      formData.append("logo", files.logo);
    }
    if (files.favicon) {
      formData.append("favicon", files.favicon);
    }

    return apiClient.put(API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Get analytics
  getAnalytics: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ANALYTICS, { params });
  },

  // Category Management
  getCategories: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.CATEGORIES, { params });
  },

  // Get public categories (for user frontend)
  getPublicCategories: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.CATEGORIES_PUBLIC);
  },

  getCategoryById: (id) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.CATEGORY_BY_ID.replace(":id", id));
  },

  createCategory: (data) => {
    // Axios will automatically handle FormData headers (including boundary)
    // No need to manually set Content-Type for FormData
    return apiClient.post(API_ENDPOINTS.ADMIN.CATEGORIES, data);
  },

  updateCategory: (id, data) => {
    // Axios will automatically handle FormData headers (including boundary)
    // No need to manually set Content-Type for FormData
    return apiClient.put(
      API_ENDPOINTS.ADMIN.CATEGORY_BY_ID.replace(":id", id),
      data,
    );
  },

  deleteCategory: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.ADMIN.CATEGORY_BY_ID.replace(":id", id),
    );
  },

  toggleCategoryStatus: (id) => {
    return apiClient.patch(
      API_ENDPOINTS.ADMIN.CATEGORY_STATUS.replace(":id", id),
    );
  },

  updateCategoryPriority: (id, priority) => {
    return apiClient.patch(
      API_ENDPOINTS.ADMIN.CATEGORY_PRIORITY.replace(":id", id),
      { priority },
    );
  },

  // Fee Settings Management (Delivery & Platform Fee)
  getFeeSettings: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.FEE_SETTINGS);
  },

  getPublicFeeSettings: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.FEE_SETTINGS_PUBLIC);
  },

  getFeeSettingsHistory: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.FEE_SETTINGS_HISTORY, { params });
  },

  createOrUpdateFeeSettings: (data) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.FEE_SETTINGS, data);
  },

  updateFeeSettings: (id, data) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.FEE_SETTINGS_BY_ID.replace(":id", id),
      data,
    );
  },

  // Zone Management
  getZones: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ZONES, { params });
  },

  getZoneById: (id) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ZONE_BY_ID.replace(":id", id));
  },

  createZone: (data) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.ZONES, data);
  },

  updateZone: (id, data) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.ZONE_BY_ID.replace(":id", id),
      data,
    );
  },

  deleteZone: (id) => {
    return apiClient.delete(API_ENDPOINTS.ADMIN.ZONE_BY_ID.replace(":id", id));
  },

  toggleZoneStatus: (id) => {
    return apiClient.patch(API_ENDPOINTS.ADMIN.ZONE_STATUS.replace(":id", id));
  },

  // Earning Addon Management
  createEarningAddon: (data) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.EARNING_ADDON, data);
  },

  getEarningAddons: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.EARNING_ADDON, { params });
  },

  getEarningAddonById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.EARNING_ADDON_BY_ID.replace(":id", id),
    );
  },

  updateEarningAddon: (id, data) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.EARNING_ADDON_BY_ID.replace(":id", id),
      data,
    );
  },

  deleteEarningAddon: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.ADMIN.EARNING_ADDON_BY_ID.replace(":id", id),
    );
  },

  toggleEarningAddonStatus: (id, status) => {
    return apiClient.patch(
      API_ENDPOINTS.ADMIN.EARNING_ADDON_STATUS.replace(":id", id),
      { status },
    );
  },

  checkEarningAddonCompletions: (deliveryPartnerId, debug = false) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.EARNING_ADDON_CHECK_COMPLETIONS, {
      deliveryPartnerId,
      debug,
    });
  },

  // Earning Addon History Management
  getEarningAddonHistory: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.EARNING_ADDON_HISTORY, { params });
  },

  getEarningAddonHistoryById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.EARNING_ADDON_HISTORY_BY_ID.replace(":id", id),
    );
  },

  creditEarningToWallet: (id, notes = "") => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.EARNING_ADDON_HISTORY_CREDIT.replace(":id", id),
      { notes },
    );
  },

  cancelEarningAddonHistory: (id, reason = "") => {
    return apiClient.patch(
      API_ENDPOINTS.ADMIN.EARNING_ADDON_HISTORY_CANCEL.replace(":id", id),
      { reason },
    );
  },

  getEarningAddonHistoryStatistics: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.EARNING_ADDON_HISTORY_STATISTICS, {
      params,
    });
  },

  // Environment Variables Management
  getEnvVariables: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ENV_VARIABLES);
  },

  saveEnvVariables: (envData) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.ENV_VARIABLES, envData);
  },

  // Public Environment Variables (for frontend use)
  getPublicEnvVariables: () => {
    return apiClient.get("/env/public");
  },

  // Delivery Boy Commission Management
  getCommissionRules: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_BOY_COMMISSION, {
      params,
    });
  },

  getCommissionRuleById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.DELIVERY_BOY_COMMISSION_BY_ID.replace(":id", id),
    );
  },

  createCommissionRule: (data) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.DELIVERY_BOY_COMMISSION, data);
  },

  updateCommissionRule: (id, data) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.DELIVERY_BOY_COMMISSION_BY_ID.replace(":id", id),
      data,
    );
  },

  deleteCommissionRule: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.ADMIN.DELIVERY_BOY_COMMISSION_BY_ID.replace(":id", id),
    );
  },

  toggleCommissionRuleStatus: (id, status) => {
    return apiClient.patch(
      API_ENDPOINTS.ADMIN.DELIVERY_BOY_COMMISSION_STATUS.replace(":id", id),
      { status },
    );
  },

  calculateCommission: (distance) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.DELIVERY_BOY_COMMISSION_CALCULATE,
      { distance },
    );
  },

  // Delivery Partner global cash limit
  getDeliveryCashLimit: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_CASH_LIMIT);
  },

  updateDeliveryCashLimit: (data) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.DELIVERY_CASH_LIMIT,
      typeof data === "object" ? data : { deliveryCashLimit: data },
    );
  },

  // Deliveryman Reviews
  getDeliverymanReviews: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_PARTNER_REVIEWS, {
      params,
    });
  },

  getCashLimitSettlements: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.CASH_LIMIT_SETTLEMENT, { params });
  },

  getDeliveryWithdrawalRequests: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_WITHDRAWAL_REQUESTS, {
      params,
    });
  },
  approveDeliveryWithdrawal: (id) => {
    const sid = id != null ? String(id) : "";
    return apiClient.post(
      API_ENDPOINTS.ADMIN.DELIVERY_WITHDRAWAL_APPROVE.replace(":id", sid),
    );
  },
  rejectDeliveryWithdrawal: (id, rejectionReason = "") => {
    const sid = id != null ? String(id) : "";
    return apiClient.post(
      API_ENDPOINTS.ADMIN.DELIVERY_WITHDRAWAL_REJECT.replace(":id", sid),
      { rejectionReason },
    );
  },

  getDeliveryBoyWallets: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_BOY_WALLET, { params });
  },
  updateDeliveryBoyWallet: (data) => {
    return apiClient.put(API_ENDPOINTS.ADMIN.DELIVERY_BOY_WALLET_UPDATE, data);
  },
  addDeliveryBoyWalletAdjustment: (data) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.DELIVERY_BOY_WALLET_ADJUSTMENT,
      data,
    );
  },

  // Delivery Emergency Help Management
  getEmergencyHelp: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_EMERGENCY_HELP);
  },

  createOrUpdateEmergencyHelp: (data) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.DELIVERY_EMERGENCY_HELP, data);
  },

  toggleEmergencyHelpStatus: () => {
    return apiClient.patch(API_ENDPOINTS.ADMIN.DELIVERY_EMERGENCY_HELP_STATUS);
  },

  // Delivery Support Tickets Management
  getDeliverySupportTickets: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_SUPPORT_TICKETS, {
      params,
    });
  },

  getDeliverySupportTicketById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.DELIVERY_SUPPORT_TICKET_BY_ID.replace(":id", id),
    );
  },

  updateDeliverySupportTicket: (id, data) => {
    return apiClient.put(
      API_ENDPOINTS.ADMIN.DELIVERY_SUPPORT_TICKET_BY_ID.replace(":id", id),
      data,
    );
  },

  getDeliverySupportTicketStats: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.DELIVERY_SUPPORT_TICKETS_STATS);
  },

  // Food Approval
  getPendingFoodApprovals: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.FOOD_APPROVALS, { params });
  },

  approveFoodItem: (id) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.FOOD_APPROVAL_APPROVE.replace(":id", id),
    );
  },

  rejectFoodItem: (id, reason) => {
    return apiClient.post(
      API_ENDPOINTS.ADMIN.FOOD_APPROVAL_REJECT.replace(":id", id),
      { reason },
    );
  },

  // Feedback Experience Management
  createFeedbackExperience: (data) => {
    return apiClient.post(API_ENDPOINTS.ADMIN.FEEDBACK_EXPERIENCE, data);
  },

  getFeedbackExperiences: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ADMIN.FEEDBACK_EXPERIENCE, { params });
  },

  getFeedbackExperienceById: (id) => {
    return apiClient.get(
      API_ENDPOINTS.ADMIN.FEEDBACK_EXPERIENCE_BY_ID.replace(":id", id),
    );
  },

  deleteFeedbackExperience: (id) => {
    return apiClient.delete(
      API_ENDPOINTS.ADMIN.FEEDBACK_EXPERIENCE_BY_ID.replace(":id", id),
    );
  },
};

export default adminAPI;
