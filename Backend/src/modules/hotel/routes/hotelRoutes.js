import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  uploadImages,
  uploadImagesBase64,
  getAddressFromCoordinates,
  searchLocation,
  calculateDistance,
  deleteImage
} from '../controllers/hotelController.js';
import upload from '../utils/multer.js';

const router = express.Router();

// Upload routes
router.post('/upload', protect, authorizedRoles('partner', 'admin'), upload.array('images', 20), uploadImages);
router.post('/upload-base64', protect, authorizedRoles('partner', 'admin'), uploadImagesBase64);
router.post('/delete-image', protect, authorizedRoles('partner', 'admin'), deleteImage);
router.post('/location/address', protect, authorizedRoles('partner', 'admin'), getAddressFromCoordinates);
router.get('/location/search', protect, authorizedRoles('partner', 'admin'), searchLocation);
router.get('/location/distance', protect, authorizedRoles('partner', 'admin'), calculateDistance);

// Notification Routes (Reusing userController logic as it handles 'partner' role check)
import { getNotifications, markNotificationRead, deleteNotifications, markAllNotificationsRead } from '../user/controllers/userController.js';

router.get('/notifications', protect, authorizedRoles('partner', 'admin'), getNotifications);
router.put('/notifications/read-all', protect, authorizedRoles('partner', 'admin'), markAllNotificationsRead);
router.put('/notifications/:id/read', protect, authorizedRoles('partner', 'admin'), markNotificationRead);
router.delete('/notifications', protect, authorizedRoles('partner', 'admin'), deleteNotifications);

export default router;

