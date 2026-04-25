import { create } from 'zustand';
import axios from 'axios';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const API_URL = `${API_ROOT}/hotel`;
const AUTH_URL = `${API_ROOT}/auth`;

const getAdminToken = () => (
  localStorage.getItem('adminToken') ||
  localStorage.getItem('admin_accessToken') ||
  localStorage.getItem('auth_admin')
);

const storeSharedAdminSession = ({ accessToken, token, refreshToken, user }) => {
  const authToken = accessToken || token;
  if (!authToken) return;

  localStorage.setItem('adminToken', authToken);
  localStorage.setItem('admin_accessToken', authToken);
  localStorage.setItem('auth_admin', authToken);
  localStorage.setItem('admin_authenticated', 'true');

  if (refreshToken) localStorage.setItem('admin_refreshToken', refreshToken);
  if (user) {
    localStorage.setItem('admin_user', JSON.stringify(user));
    localStorage.setItem('adminInfo', JSON.stringify(user));
  }
};

const clearSharedAdminSession = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('admin_accessToken');
  localStorage.removeItem('auth_admin');
  localStorage.removeItem('admin_refreshToken');
  localStorage.removeItem('admin_authenticated');
  localStorage.removeItem('admin_user');
  localStorage.removeItem('adminInfo');
};

const axiosInstance = axios.create({
  baseURL: API_URL
});

axiosInstance.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const useAdminStore = create((set, get) => ({
  admin: null,
  token: getAdminToken() || null,
  isAuthenticated: false,
  loading: true,

  setToken: (token) => {
    if (token) {
      localStorage.setItem('adminToken', token);
      localStorage.setItem('admin_accessToken', token);
      localStorage.setItem('auth_admin', token);
      set({ token, isAuthenticated: true });
    } else {
      clearSharedAdminSession();
      set({ token: null, isAuthenticated: false, admin: null });
    }
  },

  login: async (email, password) => {
    try {
      const response = await axios.post(`${AUTH_URL}/admin/login`, { email, password });
      const data = response.data?.data || response.data;
      const token = data.accessToken || data.token;
      const user = data.user || data.admin;

      storeSharedAdminSession({
        accessToken: data.accessToken,
        token: data.token,
        refreshToken: data.refreshToken,
        user
      });
      set({ admin: user, token, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (error) {
      console.error('Admin Login Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  },

  logout: () => {
    clearSharedAdminSession();
    set({ admin: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = getAdminToken();
    if (!token || token === 'undefined' || token === 'null') {
      clearSharedAdminSession();
      set({ isAuthenticated: false, admin: null, loading: false });
      return;
    }

    try {
      const response = await axios.get(`${AUTH_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data?.data || response.data;
      const user = data.user || data.admin || data;
      const role = String(user?.role || '').toUpperCase();

      if (user && ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'].includes(role)) {
        storeSharedAdminSession({ token, user });
        set({
          admin: user,
          token,
          isAuthenticated: true,
          loading: false
        });
      } else {
        get().logout();
        set({ loading: false });
      }
    } catch (error) {
      // Only log non-401 errors (401 is expected when not logged in)
      if (error.response?.status !== 401) {
        console.error('Check Auth Error:', error);
      }
      if (error.response?.status === 401) {
        get().logout();
      }
      set({ loading: false });
    }
  }
}));

// Add response interceptor to handle 401 globally for this instance
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAdminStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export { axiosInstance };
export default useAdminStore;
