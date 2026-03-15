import axios from 'axios';
import { getModuleToken } from '../auth/auth.utils';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
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
