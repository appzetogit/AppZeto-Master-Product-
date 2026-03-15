import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export zone API helper functions
export const zoneAPI = {
  // Detect user's zone based on location
  detectZone: (lat, lng) => {
    return apiClient.get(API_ENDPOINTS.ZONE.DETECT, {
      params: { lat, lng },
    });
  },
};

export default zoneAPI;
