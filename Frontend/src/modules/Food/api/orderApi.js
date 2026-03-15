import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export order API helper functions
export const orderAPI = {
  // Calculate order pricing
  calculateOrder: (orderData) => {
    return apiClient.post(API_ENDPOINTS.ORDER.CALCULATE, orderData);
  },

  // Create order and get Razorpay order
  createOrder: (orderData) => {
    return apiClient.post(API_ENDPOINTS.ORDER.CREATE, orderData);
  },

  // Verify payment
  verifyPayment: (paymentData) => {
    return apiClient.post(API_ENDPOINTS.ORDER.VERIFY_PAYMENT, paymentData);
  },

  // Get user orders
  getOrders: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.ORDER.LIST, { params });
  },

  // Complaint operations
  submitComplaint: (data) => {
    return apiClient.post(API_ENDPOINTS.USER.COMPLAINTS, data);
  },
  getUserComplaints: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.USER.COMPLAINTS, { params });
  },
  getComplaintDetails: (id) => {
    return apiClient.get(API_ENDPOINTS.USER.COMPLAINT_BY_ID.replace(":id", id));
  },

  // Get order details
  getOrderDetails: (orderId) => {
    return apiClient.get(API_ENDPOINTS.ORDER.DETAILS.replace(":id", orderId));
  },

  // Cancel order
  cancelOrder: (orderId, reason) => {
    return apiClient.patch(API_ENDPOINTS.ORDER.CANCEL.replace(":id", orderId), {
      reason,
    });
  },
};

export default orderAPI;
