import { axiosInstance } from '../app/admin/store/adminStore';

const adminService = {
  getDashboardStats: async () => {
    const response = await axiosInstance.get('/admin/dashboard-stats');
    return response.data;
  },

  getUsers: async (params) => {
    const response = await axiosInstance.get('/admin/users', { params });
    return response.data;
  },

  getPartners: async (params) => {
    const response = await axiosInstance.get('/admin/partners', { params });
    return response.data;
  },

  getHotels: async (params) => {
    const response = await axiosInstance.get('/admin/hotels', { params });
    return response.data;
  },

  getPropertyRequests: async () => {
    const response = await axiosInstance.get('/admin/property-requests');
    return response.data;
  },

  getBookings: async (params) => {
    const response = await axiosInstance.get('/admin/bookings', { params });
    return response.data;
  },

  updateHotelStatus: async (hotelId, statusOrPayload) => {
    const payload = typeof statusOrPayload === 'string'
      ? { hotelId, status: statusOrPayload }
      : { hotelId, ...statusOrPayload };
    const response = await axiosInstance.put('/admin/update-hotel-status', payload);
    return response.data;
  },

  getReviews: async (params) => {
    const response = await axiosInstance.get('/admin/reviews', { params });
    return response.data;
  },

  updateReviewStatus: async (reviewId, status) => {
    const response = await axiosInstance.put('/admin/update-review-status', { reviewId, status });
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await axiosInstance.delete('/admin/delete-review', { data: { reviewId } });
    return response.data;
  },

  updateUserStatus: async (userId, isBlocked) => {
    const response = await axiosInstance.put('/admin/update-user-status', { userId, isBlocked });
    return response.data;
  },

  updatePartnerStatus: async (userId, isBlocked) => {
    const response = await axiosInstance.put('/admin/update-partner-status', { userId, isBlocked });
    return response.data;
  },
  updatePartnerApproval: async (userId, status) => {
    const response = await axiosInstance.put('/admin/update-partner-approval', { userId, status });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await axiosInstance.delete('/admin/delete-user', { data: { userId } });
    return response.data;
  },

  deletePartner: async (userId) => {
    const response = await axiosInstance.delete('/admin/delete-partner', { data: { userId } });
    return response.data;
  },

  deleteHotel: async (hotelId) => {
    const response = await axiosInstance.delete('/admin/delete-hotel', { data: { hotelId } });
    return response.data;
  },

  updateBookingStatus: async (bookingId, status, reason) => {
    const body = { bookingId, status };
    if (reason != null && String(reason).trim() !== '') body.reason = String(reason).trim();
    const response = await axiosInstance.put('/admin/update-booking-status', body);
    return response.data;
  },

  verifyPropertyDocuments: async (propertyId, action, adminRemark) => {
    const response = await axiosInstance.put('/admin/verify-documents', { propertyId, action, adminRemark });
    return response.data;
  },

  getUserDetails: async (userId) => {
    const response = await axiosInstance.get(`/admin/user-details/${userId}`);
    return response.data;
  },

  getPartnerDetails: async (partnerId) => {
    const response = await axiosInstance.get(`/admin/partner-details/${partnerId}`);
    return response.data;
  },

  getHotelDetails: async (hotelId) => {
    const response = await axiosInstance.get(`/admin/hotel-details/${hotelId}`);
    return response.data;
  },

  getBookingDetails: async (bookingId) => {
    const response = await axiosInstance.get(`/admin/booking-details/${bookingId}`);
    return response.data;
  },

  downloadReceipt: async (bookingId) => {
    const response = await axiosInstance.get(`/bookings/${bookingId}/receipt`, {
      responseType: 'blob'
    });
    return response.data;
  },

  getLegalPages: async (params) => {
    const response = await axiosInstance.get('/admin/legal-pages', { params });
    return response.data;
  },

  saveLegalPage: async (payload) => {
    const response = await axiosInstance.post('/admin/legal-pages', payload);
    return response.data;
  },

  getContactMessages: async (params) => {
    const response = await axiosInstance.get('/admin/contact-messages', { params });
    return response.data;
  },

  updateContactStatus: async (id, status) => {
    const response = await axiosInstance.put(`/admin/contact-messages/${id}/status`, { status });
    return response.data;
  },

  getPlatformSettings: async () => {
    const response = await axiosInstance.get('/admin/platform-settings');
    return response.data;
  },

  updatePlatformSettings: async (payload) => {
    const response = await axiosInstance.put('/admin/platform-settings', payload);
    return response.data;
  },

  updateAdminProfile: async (payload) => {
    const response = await axiosInstance.put('/auth/admin/update-profile', payload);
    return response.data;
  },

  updateAdminPassword: async (payload) => {
    const response = await axiosInstance.put('/auth/admin/update-password', payload);
    return response.data;
  },

  updateFcmToken: async (fcmToken, platform = 'web') => {
    try {
      const response = await axiosInstance.put('/admin/fcm-token', { fcmToken, platform });
      return response.data;
    } catch (error) {
      console.warn('Admin FCM Token Update Failed:', error);
      return null;
    }
  },

  // Notification Methods
  getNotifications: async (page = 1, limit = 20) => {
    const response = await axiosInstance.get('/admin/notifications', { params: { page, limit } });
    return response.data;
  },

  sendNotification: async (payload) => {
    const response = await axiosInstance.post('/admin/notifications/send', payload);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await axiosInstance.put('/admin/notifications/read-all');
    return response.data;
  },

  deleteNotifications: async (ids) => {
    const response = await axiosInstance.delete('/admin/notifications', { data: { ids } });
    return response.data;
  },

  // FAQ Management
  getAllFaqs: async (params) => {
    const response = await axiosInstance.get('/faqs/admin', { params });
    return response.data;
  },

  createFaq: async (payload) => {
    const response = await axiosInstance.post('/faqs', payload);
    return response.data;
  },

  updateFaq: async (id, payload) => {
    const response = await axiosInstance.put(`/faqs/${id}`, payload);
    return response.data;
  },

  deleteFaq: async (id) => {
    const response = await axiosInstance.delete(`/faqs/${id}`);
    return response.data;
  },

  getFinanceStats: async () => {
    const response = await axiosInstance.get('/admin/finance');
    return response.data;
  },
  updateProperty: async (id, payload) => {
    const response = await axiosInstance.put(`/admin/update-property/${id}`, payload);
    return response.data;
  },
  uploadImage: async (formData) => {
    const response = await axiosInstance.post('/admin/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Withdrawal Management
  getWithdrawals: async (params) => {
    const response = await axiosInstance.get('/admin/withdrawals', { params });
    return response.data;
  },

  updateWithdrawalStatus: async (id, payload) => {
    const response = await axiosInstance.put(`/admin/withdrawals/${id}/status`, payload);
    return response.data;
  }
};

export default adminService;
