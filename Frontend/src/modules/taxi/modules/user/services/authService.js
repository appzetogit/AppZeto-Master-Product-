import api from '../../../shared/api/axiosInstance';
import { clearModuleAuth, getCurrentUser, getModuleToken } from '../../../../Food/utils/auth';

const decodeBase64Url = (value) => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return normalized + '='.repeat(padding);
};

const getTokenPayload = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const payload = token.split('.')[1];

    if (!payload) {
      return null;
    }

    return JSON.parse(atob(decodeBase64Url(payload)));
  } catch {
    return null;
  }
};

const isSharedUserRoleToken = (token) => {
  const role = String(getTokenPayload(token)?.role || '').toLowerCase();
  return role === 'user' || role === 'customer';
};

const readLocalUserToken = () => {
  const sharedUserToken =
    getModuleToken('user') ||
    localStorage.getItem('auth_customer') ||
    localStorage.getItem('user_accessToken') ||
    localStorage.getItem('accessToken');

  if (sharedUserToken) {
    return sharedUserToken;
  }

  return [
    localStorage.getItem('userToken'),
    localStorage.getItem('token'),
  ].filter(Boolean).find(isSharedUserRoleToken) || '';
};

export const getLocalUserInfo = () => {
  const sharedUser = getCurrentUser('user');
  if (sharedUser && typeof sharedUser === 'object') {
    return sharedUser;
  }

  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

export const setLocalUserInfo = (user = {}) => {
  const nextUser = user && typeof user === 'object' ? user : {};
  const serialized = JSON.stringify(nextUser);

  localStorage.setItem('userInfo', serialized);
  localStorage.setItem('user_user', serialized);
};

export const getLocalUserToken = readLocalUserToken;

export const hasLocalUserToken = () => Boolean(readLocalUserToken());

export const clearLocalUserSession = () => {
  const token = readLocalUserToken();
  const fallbackToken = localStorage.getItem('token');
  const shouldClearFallbackToken =
    Boolean(token && fallbackToken === token) ||
    Boolean(fallbackToken && isSharedUserRoleToken(fallbackToken));

  clearModuleAuth('user');

  localStorage.removeItem('userToken');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('user_user');

  if (shouldClearFallbackToken) {
    localStorage.removeItem('token');
  }

  if (String(localStorage.getItem('role') || '').toLowerCase() === 'user') {
    localStorage.removeItem('role');
  }

  if (String(localStorage.getItem('chatRole') || '').toLowerCase() === 'user') {
    localStorage.removeItem('chatRole');
  }
};

export const withUserAuth = (config = {}) => {
  const token = readLocalUserToken();

  if (!token) {
    return config;
  }

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
};

export const userAuthService = {
  signup: (payload) => api.post('/users/signup', payload),
  login: (payload) => api.post('/users/login', payload),
  startOtp: (phone) => api.post('/users/auth/send-otp', { phone }),
  verifyOtp: (phone, otp) => api.post('/users/auth/verify-otp', { phone, otp }),
  verifyOtpLogin: (phone) => api.post('/users/otp-login', { phone }),
  loginDemoUser: () => api.post('/users/otp-login', { phone: '9998887776' }),
  uploadProfileImage: (dataUrl) => api.post('/users/profile-image', { dataUrl }),
  updateCurrentUser: (payload) => api.patch('/users/me', payload, withUserAuth()),
  getCurrentUser: () => api.get('/users/me', withUserAuth()),
  getWallet: () => api.get('/users/wallet', withUserAuth()),
  topupWallet: (amount) => api.post('/users/wallet/topup', { amount }, withUserAuth()),
  transferWallet: (phone, amount) => api.post('/users/wallet/transfer', { phone, amount }, withUserAuth()),
  createWalletTopupOrder: (amount) => api.post('/users/wallet/razorpay/order', { amount }, withUserAuth()),
  verifyWalletTopup: (payload) => api.post('/users/wallet/razorpay/verify', payload, withUserAuth()),
  createWalletTopupOrder: (amount) => api.post('/users/wallet/razorpay/order', { amount }),
  verifyWalletTopup: (payload) => api.post('/users/wallet/razorpay/verify', payload),
  requestAccountDeletion: (reason) => api.post('/users/me/delete-request', { reason }),
  createWalletTopupOrder: (amount) => api.post('/users/wallet/razorpay/order', { amount }, withUserAuth()),
  verifyWalletTopup: (payload) => api.post('/users/wallet/razorpay/verify', payload, withUserAuth()),
  getNotifications: () => api.get('/users/notifications', withUserAuth()),
  deleteNotification: (id) => api.delete(`/users/notifications/${id}`, withUserAuth()),
  clearAllNotifications: () => api.delete('/users/notifications', withUserAuth()),
};
