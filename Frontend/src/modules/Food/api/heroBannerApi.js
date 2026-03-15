import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export hero banner API helper functions
export const heroBannerAPI = {
  // Get Top 10 restaurants (public)
  getTop10Restaurants: () => {
    return apiClient.get(API_ENDPOINTS.HERO_BANNER.TOP_10_PUBLIC);
  },

  // Get Gourmet restaurants (public)
  getGourmetRestaurants: () => {
    return apiClient.get(API_ENDPOINTS.HERO_BANNER.GOURMET_PUBLIC);
  },
};

export default heroBannerAPI;
