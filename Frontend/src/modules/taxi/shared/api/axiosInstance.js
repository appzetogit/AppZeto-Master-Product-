import axios from 'axios';
import { API_BASE_URL } from './runtimeConfig';
import { clearModuleAuth, getModuleToken } from '../../../Food/utils/auth';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const decodeBase64Url = (value) => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return normalized + '='.repeat(padding);
};

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

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

const isTokenValidForRole = (token, role) => {
  const payload = getTokenPayload(token);
  const tokenRole = normalizeRole(payload?.role);
  const normalizedRole = normalizeRole(role);

  if (!payload) {
    return false;
  }

  if (normalizedRole === 'user') {
    if (!['user', 'customer'].includes(tokenRole)) {
      return false;
    }
  } else if (tokenRole !== normalizedRole) {
    return false;
  }

  if (Number.isFinite(Number(payload?.exp))) {
    return Number(payload.exp) * 1000 > Date.now();
  }

  return true;
};

const getSharedUserTokens = () =>
  [
    getModuleToken('user'),
    localStorage.getItem('user_accessToken'),
    localStorage.getItem('auth_customer'),
    localStorage.getItem('accessToken'),
  ].filter(Boolean);

const getSharedAdminTokens = () =>
  [
    getModuleToken('admin'),
    localStorage.getItem('auth_admin'),
    localStorage.getItem('adminToken'),
    localStorage.getItem('token'),
  ].filter(Boolean);

const getStoredTokenByRole = (role) => {
  const normalizedRole = normalizeRole(role);
  const entries = [
    ...(normalizedRole === 'admin'
      ? getSharedAdminTokens()
      : normalizedRole === 'user'
        ? [
            ...getSharedUserTokens(),
            localStorage.getItem('userToken'),
            localStorage.getItem('token'),
          ]
        : [localStorage.getItem(`${normalizedRole}Token`), localStorage.getItem('token')]),
  ].filter(Boolean);

  return entries.find((token) => isTokenValidForRole(token, normalizedRole)) || null;
};

const getRoleFromPathname = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const pathname = String(window.location.pathname || '').toLowerCase();

  if (pathname.includes('/admin')) {
    return 'admin';
  }

  // Owners currently authenticate with driver tokens (fleet-owner flow).
  if (pathname.includes('/taxi/owner')) {
    return 'driver';
  }

  if (pathname.includes('/taxi/driver') || pathname.includes('/driver')) {
    return 'driver';
  }

  if (pathname.includes('/taxi/user') || pathname.includes('/user')) {
    return 'user';
  }

  return '';
};

const clearStaleAuthState = (role = '') => {
  const normalizedRole = normalizeRole(role);

  localStorage.removeItem('token');

  if (!normalizedRole || normalizedRole === 'user') {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('user_accessToken');
    localStorage.removeItem('user_refreshToken');
    localStorage.removeItem('user_authenticated');
    localStorage.removeItem('user_user');
    localStorage.removeItem('auth_customer');
    localStorage.removeItem('accessToken');
  }

  if (!normalizedRole || normalizedRole === 'driver') {
    localStorage.removeItem('driverToken');
    localStorage.removeItem('driverInfo');
  }

  if (!normalizedRole || normalizedRole === 'admin') {
    clearModuleAuth('admin');
    localStorage.removeItem('auth_admin');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
  }

  localStorage.removeItem('chatRole');
};

// Request Interceptor: Attach Auth Token automatically
api.interceptors.request.use(
  (config) => {
    const requestPath = String(config.url || '').split('?')[0];
    const existingAuthorization = config.headers?.Authorization || config.headers?.authorization;

    if (existingAuthorization) {
      return config;
    }

    const chatRole = localStorage.getItem('chatRole');
    const normalizedChatRole = String(chatRole || '').toLowerCase();
    const userToken = getStoredTokenByRole('user');
    const driverToken = getStoredTokenByRole('driver');
    const adminToken = getStoredTokenByRole('admin') || getModuleToken('admin') || localStorage.getItem('auth_admin') || localStorage.getItem('adminToken');

    const isPublicUserRoute =
      /^\/users\/(app-modules|goods-types|vehicle-types|register|signup|login|profile-image|auth\/send-otp|auth\/verify-otp|otp-login)(\/|$)/.test(requestPath);
    const isPublicDriverRoute =
      /^\/drivers\/(register|login|auth\/send-otp|auth\/verify-otp|onboarding\/send-otp|onboarding\/verify-otp|onboarding\/personal|onboarding\/referral|onboarding\/vehicle|onboarding\/documents|onboarding\/complete|onboarding\/session\/|service-locations)(\/|$)/.test(requestPath);
    const isAdminRoute =
      /^\/admin(\/|$)/.test(requestPath) ||
      /^\/(countries|common\/ride_modules|types\/|on-boarding(?:-|\/|$)|roles\/|permissions\/)/.test(requestPath);
    const isDriverRoute = /^\/drivers?(\/|$)/.test(requestPath);
    const isUserRoute = /^\/(users|rides|deliveries|promos)(\/|$)/.test(requestPath);
    const isSupportRoute = /^\/support(\/|$)/.test(requestPath);
    const isChatRoute = /^\/chats?(\/|$)/.test(requestPath);
    const pathRole = getRoleFromPathname();

    let token = null;

    if (isPublicUserRoute || isPublicDriverRoute) {
      token = null;
    } else if (isChatRoute) {
      if (normalizedChatRole === 'admin') {
        token = adminToken;
      } else if (normalizedChatRole === 'driver') {
        token = driverToken;
      } else if (normalizedChatRole === 'user') {
        token = userToken;
      }
    } else if (isAdminRoute) {
      token = adminToken;
    } else if (isSupportRoute) {
      if (pathRole === 'admin') {
        token = adminToken;
      } else if (pathRole === 'driver') {
        token = driverToken;
      } else {
        token = userToken;
      }
    } else if (isUserRoute) {
      token = userToken;
    } else if (isDriverRoute) {
      token = driverToken;
    } else {
      token = userToken || driverToken || adminToken;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Simplify responses and handle global errors
api.interceptors.response.use(
  (response) => {
    // Pro-Level: Many APIs return data in data.data or data.result, you can flatten it here
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Global error handling: e.g. deleted or inactive account logout
      if (error.response.status === 401 || error.response.status === 403) {
        console.warn('Unauthorized! Logging out...');
        const serverMessage = String(error.response.data?.message || error.response.data?.error || '');
        const authHeader = error.config?.headers?.Authorization || error.config?.headers?.authorization || '';
        const token = String(authHeader).startsWith('Bearer ') ? String(authHeader).slice(7) : '';
        const tokenRole = normalizeRole(getTokenPayload(token)?.role);

        const shouldClearAuth =
          serverMessage === 'Authenticated account no longer exists' ||
          (tokenRole === 'user' &&
            /user account is not active|user account is deactivated/i.test(serverMessage));

        if (shouldClearAuth) {
          clearStaleAuthState(tokenRole);
          window.dispatchEvent(new CustomEvent('app:auth-stale', {
            detail: { role: tokenRole || null, message: serverMessage },
          }));
        }
      }
      return Promise.reject({ ...error.response.data, status: error.response.status });
    }
    return Promise.reject({ message: 'Network error or server down.' });
  }
);

export default api;
