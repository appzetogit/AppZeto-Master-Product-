import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "./config.js";

const debugLog = (...args) => console.log("%c[API]", "color: #EB590E; font-weight: bold", ...args);

/**
 * Create axios instance.
 * Backend disconnected - new backend in progress. All requests return stub (no outbound calls).
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  adapter: (config) =>
    Promise.resolve({
      data: { success: false, message: "API disabled" },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }),
});

/**
 * Request Interceptor - Add Auth Token
 */
apiClient.interceptors.request.use(
  (config) => {
    const url = config.url || "";
    let tokenKey = "user_accessToken";
    
    if (url.includes('admin')) tokenKey = "admin_accessToken";
    else if (url.includes('restaurant')) tokenKey = "restaurant_accessToken";
    else if (url.includes('delivery')) tokenKey = "delivery_accessToken";
    
    const token = localStorage.getItem(tokenKey) || localStorage.getItem("accessToken");
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor - Handle Errors
 */
apiClient.interceptors.response.use(
  (response) => {
    // Automatically store tokens from real responses if they exist
    const data = response.data?.data || response.data || {};
    if (data.accessToken) {
      const url = response.config.url || "";
      let tokenKey = "user_accessToken";
      
      if (url.includes('admin')) tokenKey = "admin_accessToken";
      else if (url.includes('restaurant')) tokenKey = "restaurant_accessToken";
      else if (url.includes('delivery')) tokenKey = "delivery_accessToken";
      
      localStorage.setItem(tokenKey, data.accessToken);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem(tokenKey.replace("_accessToken", "_authenticated"), "true");
    }
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle session expiration
      if (error.response.status === 401) {
        debugLog("Session expired (401)");
        // Optional: redirect to login
      }
      
      // Handle display errors
      const errorMessage = error.response.data?.message || "Something went wrong";
      // Only toast on non-404 errors usually
      if (error.response.status !== 404 && error.config?.method !== 'get') {
        toast.error(errorMessage);
      }
    } else if (error.code === 'ERR_NETWORK') {
      toast.error("Network error. Please check your connection.");
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
