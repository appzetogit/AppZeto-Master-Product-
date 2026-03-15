import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "./config.js";

const debugLog = (...args) => console.log("%c[API]", "color: #EB590E; font-weight: bold", ...args);

/**
 * Create axios instance
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

/**
 * Request Interceptor - Add Auth Token
 */
apiClient.interceptors.request.use(
  (config) => {
    const url = config.url || "";
    const method = config.method?.toLowerCase();
    
    // --- DIRECT LOGIN BYPASS (DEVELOPMENT ONLY) ---
    // Intercepts auth and setup requests to allow entry without a backend
    const isAuth = url.includes('login') || url.includes('verify-otp') || url.includes('send-otp');
    const isOnboarding = url.includes('onboarding') || url.includes('profile') || url.includes('owner/me');
    const isUpload = url.includes('upload/media');
    
    if (isAuth || isOnboarding || isUpload) {
      debugLog("? Intercepting request for bypass:", url);
      
      // Inject custom adapter to return a mock response with a small delay
      config.adapter = async (cfg) => {
        await new Promise(r => setTimeout(r, 500)); // Simulate network delay
        
        let role = 'user';
        if (url.includes('admin')) role = 'admin';
        else if (url.includes('restaurant')) role = 'restaurant';
        else if (url.includes('delivery')) role = 'delivery';
        
        debugLog(`? Generating mock ${role} session...`);
        
        if (url.includes('send-otp')) {
          return {
            data: { success: true, message: "OTP Sent Successfully (Bypass Mode)" },
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            config: cfg,
          };
        }

        // Generic mock user/restaurant object for data calls
        const mockRestaurant = {
          id: "res_123",
          _id: "res_123",
          name: "Dev Kitchen (Mock)",
          email: "restaurant@example.com",
          phone: "1234567890",
          address: "123 Tech Park, Silicon Valley",
          status: "active",
          isOnboarded: true,
          isOpen: true,
          config: { onboardingStep: "completed" }
        };

        if (url.includes('onboarding') || url.includes('profile') || url.includes('owner/me')) {
          return {
            data: { 
              success: true, 
              data: { restaurant: mockRestaurant, profile: mockRestaurant, onboarding: { status: 'completed' } } 
            },
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            config: cfg,
          };
        }

        if (url.includes('upload/media')) {
          return {
            data: { 
              success: true, 
              data: { url: "https://placehold.co/600x400?text=Mock+Upload", filename: "mock_image.png" } 
            },
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            config: cfg,
          };
        }

        // Validate OTP if it's a verification request
        if (url.includes('verify-otp')) {
          const { otp } = JSON.parse(cfg.data || "{}");
          if (otp !== '1234') {
            return {
              data: { success: false, message: "Invalid OTP. Please use 1234" },
              status: 400,
              statusText: 'Bad Request',
              headers: { 'content-type': 'application/json' },
              config: cfg,
            };
          }
        }

        // Validate Admin Password if it's a direct login
        if (url.includes('admin') && url.includes('login')) {
          const { password } = JSON.parse(cfg.data || "{}");
          if (password !== 'admin123') {
             return {
              data: { success: false, message: "Invalid Admin Credentials" },
              status: 401,
              statusText: 'Unauthorized',
              headers: { 'content-type': 'application/json' },
              config: cfg,
            };
          }
        }

        const mockToken = `header.${btoa(JSON.stringify({ 
          role, 
          id: 'dev_user_id', 
          userId: 'dev_user_id',
          exp: Math.floor(Date.now() / 1000) + 86400 
        }))}.signature`;

        return {
          data: {
            success: true,
            data: {
              accessToken: mockToken,
              [role]: { 
                id: "dev_123", 
                _id: "dev_123",
                name: "Developer Admin", 
                email: "admin@example.com", 
                role: role 
              },
              user: { 
                id: "dev_123", 
                _id: "dev_123",
                name: "Developer Admin", 
                email: "admin@example.com", 
                role: role 
              }
            },
            message: "Direct Login Successful (Bypass Mode)"
          },
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          config: cfg,
        };
      };
      return config;
    }
    // ----------------------------------------------

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
