import express from 'express';
import { getUserProfile, updateUserProfile, deleteUserAccount, updateFcmToken, getNotifications, markNotificationRead, deleteNotifications, markAllNotificationsRead, getSavedHotels, toggleSavedHotel } from '../controllers/userController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.delete('/profile', protect, deleteUserAccount);
router.put('/fcm-token', protect, updateFcmToken);

// Wishlist Routes
router.get('/saved-hotels', protect, getSavedHotels);
router.post('/saved-hotels/:id', protect, toggleSavedHotel);

// Notification Routes
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read-all', protect, markAllNotificationsRead); // Must be before :id
router.put('/notifications/:id/read', protect, markNotificationRead);
router.delete('/notifications', protect, deleteNotifications);

export default router;
