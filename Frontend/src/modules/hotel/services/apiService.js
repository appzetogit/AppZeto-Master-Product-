import axios from 'axios';

const isNativeLikeShell = () => {
  if (typeof window === 'undefined') return false;

  const protocol = String(window.location?.protocol || '').toLowerCase();
  const userAgent = String(window.navigator?.userAgent || '').toLowerCase();

  return (
    Boolean(window.flutter_inappwebview) ||
    Boolean(window.ReactNativeWebView) ||
    protocol === 'file:' ||
    userAgent.includes(' wv') ||
    userAgent.includes('; wv') ||
    userAgent.includes('flutterwebview')
  );
};

const resolveApiRoot = () => {
  const configured =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api/v1';

  const trimmed = String(configured || '').replace(/\/$/, '');

  try {
    const parsed = new URL(trimmed);
    const isLocalApiHost = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);

    if (isNativeLikeShell() && isLocalApiHost) {
      // Android emulators cannot reach host-machine localhost directly.
      parsed.hostname = '10.0.2.2';
      return parsed.toString().replace(/\/$/, '');
    }
  } catch {
    // Fall back to the raw configured value below.
  }

  return trimmed;
};

// Base URL configuration
const API_ROOT = resolveApiRoot();
const API_URL = `${API_ROOT}/hotel`;
const AUTH_URL = `${API_ROOT}/auth`;

const getUserToken = () => (
  localStorage.getItem('token') ||
  localStorage.getItem('user_accessToken') ||
  localStorage.getItem('accessToken') ||
  localStorage.getItem('auth_customer')
);

const getAdminToken = () => (
  localStorage.getItem('adminToken') ||
  localStorage.getItem('admin_accessToken') ||
  localStorage.getItem('auth_admin')
);

const storeSharedUserSession = ({ accessToken, token, refreshToken, user }) => {
  const authToken = accessToken || token;
  if (!authToken) return;

  localStorage.setItem('token', authToken);
  localStorage.setItem('accessToken', authToken);
  localStorage.setItem('user_accessToken', authToken);
  localStorage.setItem('auth_customer', authToken);
  localStorage.setItem('user_authenticated', 'true');

  if (refreshToken) localStorage.setItem('user_refreshToken', refreshToken);
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('user_user', JSON.stringify(user));
  }
};

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds timeout
});

// Interceptor to add Token and Log
api.interceptors.request.use((config) => {
  const token = getUserToken();
  const adminToken = getAdminToken();

  // Preference to adminToken if on /admin path, else normal token
  const effectiveToken = window.location.pathname.startsWith('/hotel/admin') ? (adminToken || token) : (token || adminToken);

  if (effectiveToken) {
    config.headers.Authorization = `Bearer ${effectiveToken}`;
  }
  console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
}, (error) => Promise.reject(error));

// Interceptor to handle account blocked (403 isBlocked) — tokens never expire so 401 does NOT auto-logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const isBlocked = error.response?.data?.isBlocked;

    // Only force-logout if account is explicitly blocked by admin
    if (status === 403 && isBlocked) {
      const isAdminPath = window.location.pathname.startsWith('/hotel/admin');

      if (isAdminPath) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin_accessToken');
        localStorage.removeItem('auth_admin');
        if (!window.location.pathname.includes('/login')) {
          console.warn("Admin account blocked. Redirecting to admin login...");
          window.location.href = '/admin/login';
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user_accessToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('auth_customer');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/otp')) {
          console.warn("Account blocked by admin. Redirecting to login...");
          if (window.location.pathname.includes('/hotel/')) {
            window.location.href = '/hotel/login';
          } else {
            window.location.href = '/';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// User Auth Services
export const authService = {
  // Check if phone or email exists
  checkExists: async (phone, email, role = 'user') => {
    try {
      const response = await api.post('/auth/validate-exists', { phone, email, role });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Send OTP
  sendOtp: async (phone, type = 'login', role = 'user', email = '') => {
    try {
      const response = role === 'partner' && type === 'login'
        ? await axios.post(`${AUTH_URL}/hotel-partner/request-otp`, { phone })
        : role === 'partner'
          ? await api.post('/auth/send-otp', { phone, type, role, email })
          : await axios.post(`${AUTH_URL}/user/request-otp`, { phone });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify OTP & Login/Register
  verifyOtp: async (data) => {
    try {
      const { verifyOnly, ...payload } = data;
      const isPartnerLogin = payload.role === 'partner' && !verifyOnly;
      const response = isPartnerLogin
        ? await axios.post(`${AUTH_URL}/hotel-partner/verify-otp`, {
          phone: payload.phone,
          otp: payload.otp,
          fcmToken: payload.fcmToken,
          platform: payload.platform
        })
        : payload.role === 'partner'
          ? await api.post('/auth/verify-otp?verifyOnly=true', payload)
          : await axios.post(`${AUTH_URL}/user/verify-otp`, {
          phone: payload.phone,
          otp: payload.otp,
          ref: payload.referralCode,
          name: payload.name,
          fcmToken: payload.fcmToken,
          platform: payload.platform
          });
      const responseData = response.data?.data || response.data;

      if (responseData.token || responseData.accessToken) {
        storeSharedUserSession({
          accessToken: responseData.accessToken,
          token: responseData.token,
          refreshToken: responseData.refreshToken,
          user: responseData.user
        });
      }
      return responseData;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify Partner OTP & Register
  verifyPartnerOtp: async (data) => {
    try {
      const response = await api.post('/auth/partner/verify-otp', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Initiate Partner Registration (Step 1 & 2)
  registerPartner: async (data) => {
    try {
      const response = await api.post('/auth/partner/register', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload Partner Docs
  uploadDocs: async (formData) => {
    try {
      const response = await api.post('/auth/partner/upload-docs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Partner Doc
  deleteDoc: async (publicId) => {
    try {
      const response = await api.post('/auth/partner/delete-doc', { publicId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload Partner Docs via Base64 (Flutter Camera)
  uploadDocsBase64: async (images) => {
    try {
      const response = await api.post('/auth/partner/upload-docs-base64', { images });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update Profile
  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/update-profile', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};



// Booking Services
export const bookingService = {
  create: async (bookingData) => {
    try {
      const response = await api.post('/bookings', bookingData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getMyBookings: async (type) => {
    try {
      const url = type ? `/bookings/my?type=${type}` : '/bookings/my';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerBookings: async (status) => {
    try {
      const url = status ? `/bookings/partner?status=${status}` : '/bookings/partner';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getBookingDetail: async (id) => {
    try {
      const response = await api.get(`/bookings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerBookingDetail: async (id) => {
    try {
      const response = await api.get(`/bookings/${id}/partner-detail`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  markAsPaid: async (id) => {
    try {
      const response = await api.put(`/bookings/${id}/mark-paid`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  markNoShow: async (id) => {
    try {
      const response = await api.put(`/bookings/${id}/no-show`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  checkIn: async (id) => {
    try {
      const response = await api.put(`/bookings/${id}/check-in`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  checkOut: async (id, force = false) => {
    try {
      const url = force ? `/bookings/${id}/check-out?force=true` : `/bookings/${id}/check-out`;
      const response = await api.put(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  cancel: async (bookingId, reason) => {
    try {
      const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },


};

// Property Services (New)
export const propertyService = {
  create: async (data) => {
    try {
      const response = await api.post('/properties', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  upsertDocuments: async (propertyId, documents) => {
    try {
      const response = await api.post(`/properties/${propertyId}/documents`, { documents });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  update: async (id, data) => {
    try {
      const response = await api.put(`/properties/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  addRoomType: async (propertyId, data) => {
    try {
      const response = await api.post(`/properties/${propertyId}/room-types`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateRoomType: async (propertyId, roomTypeId, data) => {
    try {
      const response = await api.put(`/properties/${propertyId}/room-types/${roomTypeId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteRoomType: async (propertyId, roomTypeId) => {
    try {
      const response = await api.delete(`/properties/${propertyId}/room-types/${roomTypeId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getMy: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties/my?${params}` : '/properties/my';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPublic: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties?${params}` : '/properties';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getDetails: async (id) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Hotel Services (Updated)
export const hotelService = {
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties?${params}` : '/properties';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getMyHotels: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties/my?${params}` : '/properties/my';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getCurrentLocation: async () => {
    try {
      const response = await api.get('/hotels/location/current');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  uploadImages: async (formData) => {
    try {
      const response = await api.post('/hotels/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  uploadImagesBase64: async (images) => {
    try {
      const response = await api.post('/hotels/upload-base64', { images });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAddressFromCoordinates: async (lat, lng) => {
    try {
      const response = await api.post('/hotels/location/address', { lat, lng });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  saveOnboardingStep: async (data) => {
    try {
      const response = await api.post('/hotels/onboarding/save-step', data);
      return response.data;
    } catch (error) {
      console.warn("Draft Save Error:", error);
      if (error.response && error.response.status === 404) {
        const errObj = typeof error.response.data === 'object' ? { ...error.response.data } : { message: error.response.data };
        errObj.status = 404;
        throw errObj;
      }
      throw error.response?.data || error.message;
    }
  },
  searchLocation: async (query) => {
    try {
      const response = await api.get(`/hotels/location/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  calculateDistance: async (originLat, originLng, destLat, destLng) => {
    try {
      const response = await api.get(`/hotels/location/distance?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteHotel: async (id) => {
    try {
      const response = await api.delete(`/hotels/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Notification Methods for Partners
  getNotifications: async (page = 1, limit = 20) => {
    try {
      const response = await api.get(`/hotels/notifications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  markAllNotificationsRead: async () => {
    try {
      const response = await api.put('/hotels/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteNotifications: async (ids) => {
    try {
      const response = await api.delete('/hotels/notifications', { data: { ids } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteImage: async (url, publicId) => {
    try {
      const response = await api.post('/hotels/delete-image', { url, publicId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Update FCM Token for Partner
  updateFcmToken: async (fcmToken, platform = 'web') => {
    try {
      const response = await api.put('/partners/fcm-token', { fcmToken, platform });
      return response.data;
    } catch (error) {
      console.warn('Partner FCM Token Update Failed:', error);
      return null;
    }
  },
  deletePartnerAccount: async () => {
    try {
      const response = await api.delete('/partners/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// User Profile Services
export const userService = {
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateProfile: async (data) => {
    try {
      const response = await api.put('/users/profile', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Get Saved Hotels
  getSavedHotels: async () => {
    try {
      const response = await api.get('/users/saved-hotels');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Toggle Saved Hotel
  toggleSavedHotel: async (hotelId) => {
    try {
      const response = await api.post(`/users/saved-hotels/${hotelId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Update FCM Token
  updateFcmToken: async (fcmToken, platform = 'web') => {
    try {
      const response = await api.put('/users/fcm-token', { fcmToken, platform });
      return response.data;
    } catch (error) {
      console.warn('FCM Token Update Failed:', error);
      return null;
    }
  },

  // Get Notifications
  getNotifications: async (page = 1, limit = 20) => {
    try {
      const response = await api.get(`/users/notifications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Notifications (Bulk)
  deleteNotifications: async (ids) => {
    try {
      // Use DELETE method with data body (supported by Axios)
      const response = await api.delete('/users/notifications', { data: { ids } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mark All Notifications Read
  markAllNotificationsRead: async () => {
    try {
      const response = await api.put('/users/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteAccount: async () => {
    try {
      const response = await api.delete('/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Offer & Coupon Services
export const offerService = {
  // Use by users to see available coupons
  getActive: async () => {
    try {
      const response = await api.get('/offers');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Validate coupon before booking
  validate: async (code, bookingAmount) => {
    try {
      const response = await api.post('/offers/validate', { code, bookingAmount });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Get all for admin management
  getAll: async () => {
    try {
      const response = await api.get('/offers/all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Create new (Admin)
  create: async (offerData) => {
    try {
      const response = await api.post('/offers', offerData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};



export const paymentService = {
  createOrder: async (bookingId) => {
    try {
      const response = await api.post('/payments/create-order', { bookingId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  verifyPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments/verify', paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const legalService = {
  getPage: async (audience, slug) => {
    try {
      const response = await api.get(`/info/${audience}/${slug}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPlatformStatus: async () => {
    try {
      const response = await api.get('/info/platform/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getFinancialSettings: async () => {
    try {
      const response = await api.get('/info/platform/financials');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  submitContact: async (audience, payload) => {
    try {
      const response = await api.post(`/contact/${audience}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Availability & Inventory Services
export const availabilityService = {
  check: async (params) => {
    try {
      const response = await api.get('/availability/check', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createWalkIn: async (data) => {
    try {
      const response = await api.post('/availability/partner/walkin', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createExternal: async (data) => {
    try {
      const response = await api.post('/availability/partner/external-booking', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  blockDates: async (data) => {
    try {
      const response = await api.post('/availability/partner/block-inventory', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getLedger: async (params) => {
    try {
      const response = await api.get('/availability/partner/ledger', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const reviewService = {
  getPropertyReviews: async (propertyId) => {
    try {
      const response = await api.get(`/reviews/${propertyId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createReview: async (reviewData) => {
    try {
      const response = await api.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerStats: async () => {
    try {
      const response = await api.get('/reviews/partner/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAllPartnerReviews: async (status) => {
    try {
      const url = status ? `/reviews/partner/all?status=${status}` : '/reviews/partner/all';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  reply: async (reviewId, reply) => {
    try {
      const response = await api.post(`/reviews/${reviewId}/reply`, { reply });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  toggleHelpful: async (reviewId) => {
    try {
      const response = await api.post(`/reviews/${reviewId}/helpful`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const referralService = {
  getMyStats: async () => {
    try {
      const response = await api.get('/referrals/my-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getActiveProgram: async () => {
    try {
      const response = await api.get('/referrals/program/active');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const handleResponse = (response) => response.data;

export const handleError = (error) => {
  throw error.response?.data || error.message;
};

/* --- FAQ SERVICES --- */
export const faqService = {
  // Public - Get active FAQs for an audience
  getFaqs: async (audience) => {
    try {
      const response = await api.get(`/faqs?audience=${audience}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Admin - Get all FAQs
  getAllFaqsAdmin: async (audience) => {
    try {
      const response = await api.get(`/faqs/admin?audience=${audience}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createFaq: async (faqData) => {
    try {
      const response = await api.post('/faqs', faqData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateFaq: async (id, faqData) => {
    try {
      const response = await api.put(`/faqs/${id}`, faqData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteFaq: async (id) => {
    try {
      const response = await api.delete(`/faqs/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default api;
