import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export location API helper functions
export const locationAPI = {
  // Reverse geocode coordinates to address
  reverseGeocode: (lat, lng) => {
    return apiClient.get(API_ENDPOINTS.LOCATION.REVERSE_GEOCODE, {
      params: { lat, lng },
    });
  },
  // Get nearby locations
  getNearbyLocations: (lat, lng, radius = 500, query = "") => {
    return apiClient.get(API_ENDPOINTS.LOCATION.NEARBY, {
      params: { lat, lng, radius, query },
    });
  },
};

export default locationAPI;
