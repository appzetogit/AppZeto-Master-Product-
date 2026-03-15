import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Upload / media helper functions
export const uploadAPI = {
  /**
   * Upload a single image/video file to Cloudinary via backend
   * @param {File} file - Browser File object
   * @param {Object} options - Optional { folder }
   */
  uploadMedia: (file, options = {}) => {
    const formData = new FormData();
    formData.append("file", file);
    if (options.folder) {
      formData.append("folder", options.folder);
    }

    return apiClient.post(API_ENDPOINTS.UPLOAD.MEDIA, formData);
  },
};

export default uploadAPI;
