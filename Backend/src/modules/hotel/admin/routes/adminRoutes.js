import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  getAllPartners,
  getAllHotels,
  getAllBookings,
  getPropertyRequests,
  updateHotelStatus,
  getReviewModeration,
  deleteReview,
  updateReviewStatus,
  updateUserStatus,
  updatePartnerStatus,
  deleteUser,
  deletePartner,
  getUserDetails,
  getPartnerDetails,
  updatePartnerApprovalStatus,
  getLegalPages,
  upsertLegalPage,
  getContactMessages,
  updateContactStatus,
  getPlatformSettings,
  updatePlatformSettings,
  verifyPropertyDocuments,
  getHotelDetails,
  getBookingDetails,
  updateBookingStatus,
  deleteHotel,
  updateFcmToken,
  getAdminNotifications,
  createBroadcastNotification,
  markAllAdminNotificationsRead,
  deleteAdminNotifications,
  getFinanceStats,
  adminUpdateProperty,
  uploadPropertyImage
} from '../controllers/adminController.js';
import { protect, authorizedRoles } from '../../middlewares/authMiddleware.js';
import { uploadDocuments } from '../../utils/multer.js';
import { getWithdrawals, updateWithdrawalStatus, adminAdjustWallet } from '../../controllers/walletController.js';

const router = express.Router();

router.use(protect);
router.use(authorizedRoles('admin', 'superadmin'));

// Withdrawal Management
router.get('/withdrawals', getWithdrawals);
router.put('/withdrawals/:id/status', updateWithdrawalStatus);
router.post('/wallet/adjust', adminAdjustWallet);

// Notifications
router.get('/notifications', getAdminNotifications);
router.post('/notifications/send', createBroadcastNotification);
router.put('/notifications/read-all', markAllAdminNotificationsRead);
router.delete('/notifications', deleteAdminNotifications);

router.put('/fcm-token', updateFcmToken);
router.get('/dashboard-stats', getDashboardStats);
router.get('/finance', getFinanceStats);
router.get('/users', getAllUsers);
router.get('/partners', getAllPartners);
router.get('/hotels', getAllHotels);
router.get('/bookings', getAllBookings);
router.get('/property-requests', getPropertyRequests);
router.put('/hotel-status', updateHotelStatus);
router.put('/update-hotel-status', updateHotelStatus);
router.get('/reviews', getReviewModeration);
router.delete('/delete-review', deleteReview);
router.put('/update-review-status', updateReviewStatus);
router.put('/update-user-status', updateUserStatus);
router.put('/update-partner-status', updatePartnerStatus);
router.put('/update-partner-approval', updatePartnerApprovalStatus);
router.delete('/delete-user', deleteUser);
router.delete('/delete-partner', deletePartner);
router.delete('/delete-hotel', deleteHotel);
router.get('/user-details/:id', getUserDetails);
router.get('/partner-details/:id', getPartnerDetails);
router.put('/verify-documents', verifyPropertyDocuments);
router.put('/update-property/:id', adminUpdateProperty);
router.get('/hotel-details/:id', getHotelDetails);
router.get('/booking-details/:id', getBookingDetails);
router.put('/booking-status', updateBookingStatus);
router.put('/update-booking-status', updateBookingStatus);
router.get('/legal-pages', getLegalPages);
router.post('/legal-pages', upsertLegalPage);
router.get('/contact-messages', getContactMessages);
router.put('/contact-messages/:id/status', updateContactStatus);
router.get('/platform-settings', getPlatformSettings);
router.put('/platform-settings', updatePlatformSettings);
router.post('/upload-image', uploadDocuments.array('images', 20), uploadPropertyImage);

export default router;
