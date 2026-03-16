import axios from 'axios';
import { getModuleToken } from '../auth/auth.utils';

// Backend disconnected - new backend in progress. No outbound requests.
const axiosInstance = axios.create({
  baseURL: "",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  adapter: (config) =>
    Promise.resolve({
      data: { success: false, message: "API disabled" },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }),
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    // Determine which module the request is for to get the correct token
    // For now, look for module name in config or default to 'user'
    const module = config.module || 'user';
    const token = getModuleToken(module);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle global errors here
    return Promise.reject(error);
  }
);

export default axiosInstance;
