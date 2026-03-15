import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Public pages API (Terms, Privacy, etc.)
export const publicAPI = {
  getTerms: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.TERMS_PUBLIC);
  },
  getPrivacy: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.PRIVACY_PUBLIC);
  },
  getAbout: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.ABOUT_PUBLIC);
  },
  getRefund: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.REFUND_PUBLIC);
  },
  getShipping: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.SHIPPING_PUBLIC);
  },
  getCancellation: () => {
    return apiClient.get(API_ENDPOINTS.ADMIN.CANCELLATION_PUBLIC);
  }
};

export default publicAPI;
