import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../../core/roles/role.middleware.js';
import { registerDeliveryPartnerController, updateDeliveryPartnerProfileController, updateDeliveryPartnerBankDetailsController, listSupportTicketsController, createSupportTicketController, getSupportTicketByIdController, updateDeliveryPartnerDetailsController, updateDeliveryPartnerProfilePhotoBase64Controller, updateAvailabilityController, getWalletController, getEarningsController, getTripHistoryController, getPocketDetailsController, getEmergencyHelpController, getCashLimitController } from '../controllers/delivery.controller.js';

const router = express.Router();

const uploadFields = upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'aadharPhoto', maxCount: 1 },
    { name: 'panPhoto', maxCount: 1 },
    { name: 'drivingLicensePhoto', maxCount: 1 }
]);

router.post('/register', uploadFields, registerDeliveryPartnerController);

router.patch('/profile', authMiddleware, requireRoles('DELIVERY_PARTNER'), uploadFields, updateDeliveryPartnerProfileController);

// JSON-only profile updates (no files) – safe for web updates like vehicle number.
router.patch('/profile/details', authMiddleware, requireRoles('DELIVERY_PARTNER'), updateDeliveryPartnerDetailsController);

// Base64 profile photo update – designed for Flutter in-app WebView camera handler.
router.post('/profile/photo-base64', authMiddleware, requireRoles('DELIVERY_PARTNER'), updateDeliveryPartnerProfilePhotoBase64Controller);

router.patch('/profile/bank-details', authMiddleware, requireRoles('DELIVERY_PARTNER'), updateDeliveryPartnerBankDetailsController);

router.patch('/availability', authMiddleware, requireRoles('DELIVERY_PARTNER'), updateAvailabilityController);

router.get('/support-tickets', authMiddleware, requireRoles('DELIVERY_PARTNER'), listSupportTicketsController);
router.post('/support-tickets', authMiddleware, requireRoles('DELIVERY_PARTNER'), createSupportTicketController);
router.get('/support-tickets/:id', authMiddleware, requireRoles('DELIVERY_PARTNER'), getSupportTicketByIdController);

// Pocket / requests page – wallet, earnings, and admin-set delivery settings
router.get('/wallet', authMiddleware, requireRoles('DELIVERY_PARTNER'), getWalletController);
router.get('/earnings', authMiddleware, requireRoles('DELIVERY_PARTNER'), getEarningsController);
router.get('/trip-history', authMiddleware, requireRoles('DELIVERY_PARTNER'), getTripHistoryController);
router.get('/pocket-details', authMiddleware, requireRoles('DELIVERY_PARTNER'), getPocketDetailsController);
router.get('/emergency-help', authMiddleware, requireRoles('DELIVERY_PARTNER'), getEmergencyHelpController);
router.get('/cash-limit', authMiddleware, requireRoles('DELIVERY_PARTNER'), getCashLimitController);

export default router;

