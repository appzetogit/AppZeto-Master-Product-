import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../../core/roles/role.middleware.js';
import { registerDeliveryPartnerController, updateDeliveryPartnerProfileController, updateDeliveryPartnerBankDetailsController, listSupportTicketsController, createSupportTicketController, getSupportTicketByIdController, updateDeliveryPartnerDetailsController, updateDeliveryPartnerProfilePhotoBase64Controller, updateAvailabilityController } from '../controllers/delivery.controller.js';

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

export default router;

