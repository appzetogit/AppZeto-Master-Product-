import express from 'express';
import { protect, authorizedRoles } from '../../middlewares/authMiddleware.js';
import {
  getPartnerNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotifications,
  updateFcmToken,
  deletePartnerAccount
} from '../controllers/partnerController.js';

const router = express.Router();

router.use(protect);
router.use(authorizedRoles('partner', 'admin'));
router.delete('/profile', deletePartnerAccount);

// Notification Routes
router.get('/notifications', getPartnerNotifications);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);
router.delete('/notifications', deleteNotifications);
router.put('/fcm-token', updateFcmToken);

export default router;
