import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "./config.js";

const debugLog = (...args) => console.log("%c[MockAPI]", "color: #EB590E; font-weight: bold", ...args);

/**
 * HELPER: Generate a valid-looking Mock JWT payload
 * This allows the client-side auth utilities to decode the token correctly.
 */
function generateMockJWT(role, id) {
  try {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, '');
    const payload = btoa(JSON.stringify({
      role: role,
      userId: id,
      id: id,
      userName: "Mock " + role,
      email: role + "@example.com",
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
      iat: Math.floor(Date.now() / 1000)
    })).replace(/=/g, '');
    return `${header}.${payload}.mock_signature`;
  } catch (e) {
    return "invalid.mock.token";
  }
}

/**
 * COMPREHENSIVE STATIC MOCK DATA
 */
const MOCK_DATA = {
  // Business Settings
  'business-settings/public': {
    success: true,
    data: {
      companyName: "QuickSpicy",
      logo: { url: "/food/assets/quicky-spicy-logo.png" },
      favicon: { url: "/favicon.ico" },
      primaryColor: "#EB590E",
      currencySymbol: "₹",
      deliveryCharge: 40,
      taxPercent: 5
    }
  },

  // Authentication
  'admin/auth/login': (data) => ({
    success: true,
    data: {
      accessToken: generateMockJWT("admin", "a123"),
      admin: { id: "a123", name: "AppZeto Admin", email: data?.email || "admin@appzeto.com", role: "admin" }
    }
  }),
  'restaurant/auth/login': (data) => ({
    success: true,
    data: {
      accessToken: generateMockJWT("restaurant", "r123"),
      restaurant: { id: "r123", name: "Pizza Hut Owner", email: data?.email || "owner@pizzahut.com", role: "restaurant" }
    }
  }),
  'auth/login': (data) => ({
    success: true,
    data: {
      accessToken: generateMockJWT("user", "u123"),
      user: { id: "u123", name: "Mock User", email: data?.email || "user@example.com", role: "user" }
    }
  }),
  
  // OTP Flow
  'auth/send-otp': { success: true, message: "OTP sent successfully (Mocked)" },
  'restaurant/auth/send-otp': { success: true, message: "OTP sent successfully (Mocked)" },
  'auth/verify-otp': {
    success: true,
    data: {
      accessToken: generateMockJWT("user", "u123"),
      user: { id: "u123", name: "Mock User", phone: "1234567890", role: "user" }
    }
  },
  'restaurant/auth/verify-otp': {
    success: true,
    data: {
      accessToken: generateMockJWT("restaurant", "r123"),
      restaurant: { id: "r123", name: "Pizza Hut Mock", role: "restaurant" }
    }
  },
  
  // Self Info
  'auth/me': {
    success: true,
    data: { user: { id: "u123", name: "Mock User", email: "user@example.com", role: "user" } }
  },
  'admin/auth/me': {
    success: true,
    data: { admin: { id: "a123", name: "AppZeto Admin", email: "admin@appzeto.com", role: "admin" } }
  },
  'restaurant/auth/me': {
    success: true,
    data: { restaurant: { id: "r123", name: "Pizza Hut Mock", role: "restaurant" } }
  },

  // Dashboard & Stats
  'admin/dashboard/stats': {
    success: true,
    data: {
      totalOrders: 1540,
      totalRevenue: 450000,
      activeRestaurants: 85,
      totalUsers: 12000,
      recentOrders: [],
      salesAnalytics: []
    }
  },
  'admin/analytics': {
    success: true,
    data: { orders: 150, revenue: 50000 }
  },

  // Lists
  'restaurant/list': {
    success: true,
    data: [
      { _id: "r1", name: "Red n Hot Pizza", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591", rating: 4.5, deliveryTime: "25-30 min", cuisines: ["Pizza", "Italian"] },
      { _id: "r2", name: "Meat Pasta Central", image: "https://images.unsplash.com/photo-1563379091339-0efb17c38dec", rating: 4.2, deliveryTime: "20-25 min", cuisines: ["Pasta", "Continental"] },
      { _id: "r3", name: "Fresh Burgers", image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add", rating: 4.8, deliveryTime: "15-20 min", cuisines: ["Burgers", "Fast Food"] }
    ]
  },
  'zones/detect': { success: true, data: { id: "z1", name: "Downtown Zone" } },
  'categories/public': {
    success: true,
    data: [
      { id: "c1", name: "Pizza", image: "https://cdn-icons-png.flaticon.com/512/3595/3595455.png" },
      { id: "c2", name: "Burger", image: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png" },
      { id: "c3", name: "Thali", image: "https://cdn-icons-png.flaticon.com/512/2276/2276931.png" }
    ]
  },
  'hero-banners/public': {
    success: true,
    data: [
      { id: "b1", title: "Flat 50% Off", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836" },
      { id: "b2", title: "Free Delivery", image: "https://images.unsplash.com/photo-1512152272829-e3139592d56f" }
    ]
  }
};

/**
 * Create axial instance
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

/**
 * ULTIMATE MOCK ADAPTER
 * This replaces the network layer entirely for mocked endpoints.
 */
apiClient.interceptors.request.use((config) => {
  const url = config.url || "";
  const method = config.method?.toLowerCase();
  
  // Normalize data if it's a string
  let payload = config.data;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch(e) {}
  }

  // Find matching mock
  let mockResult = null;
  for (const key in MOCK_DATA) {
    if (url.includes(key)) {
      const entry = MOCK_DATA[key];
      mockResult = typeof entry === 'function' ? entry(payload) : entry;
      break;
    }
  }

  // If no specific mock, but it's an API call, return a generic success
  if (!mockResult && (url.startsWith('/api') || url.includes('/auth/') || url.includes('/admin/') || url.includes('/restaurant/') || url.includes('/user/'))) {
     mockResult = { 
       success: true, 
       data: method === 'get' ? [] : {}, 
       message: "Authenticated Mock Response" 
     };
  }

  if (mockResult) {
    debugLog(`🚀 Short-circuiting ${method.toUpperCase()} ${url} with MOCK DATA`);
    
    // Inject custom adapter to resolve immediately
    config.adapter = (cfg) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            data: mockResult,
            status: 200,
            statusText: 'OK',
            headers: cfg.headers,
            config: cfg,
          });
        }, 300); // Simulate minimal network delay
      });
    };
  }

  return config;
}, (error) => Promise.reject(error));

/**
 * Response Interceptor - Token Storage and Error Cleanup
 */
apiClient.interceptors.response.use(
  (response) => {
    // Proactively store tokens from mock responses
    if (response.data?.data?.accessToken) {
      const url = response.config.url || "";
      let tokenKey = "accessToken";
      
      if (url.includes('admin/')) tokenKey = "admin_accessToken";
      else if (url.includes('restaurant/')) tokenKey = "restaurant_accessToken";
      else if (url.includes('delivery/')) tokenKey = "delivery_accessToken";
      else tokenKey = "user_accessToken";
      
      localStorage.setItem(tokenKey, response.data.data.accessToken);
      localStorage.setItem("accessToken", response.data.data.accessToken);
      console.log(`[MockAuth] Stored ${tokenKey}`);
    }
    return response;
  },
  (error) => {
    // If we've reached here, it means the adapter failed or wasn't used.
    // Fallback: Return empty success for 404s/Network Errors to keep UI alive.
    if (!error.response || error.response.status === 404 || error.code === 'ERR_NETWORK') {
      debugLog(`⚠️ Fallback error handler triggered for: ${error.config?.url}`);
      return Promise.resolve({
        data: { success: true, data: error.config?.method === 'get' ? [] : {}, message: "Static Fallback" },
        status: 200, statusText: 'OK', headers: {}, config: error.config
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
