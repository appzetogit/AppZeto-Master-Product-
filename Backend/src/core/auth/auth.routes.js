import express from 'express';
import {
    requestUserOtpController,
    verifyUserOtpController,
    adminLoginController,
    refreshTokenController,
    requestRestaurantOtpController,
    verifyRestaurantOtpController,
    requestDeliveryOtpController,
    verifyDeliveryOtpController,
    logoutController,
    getMeController
} from './auth.controller.js';
import { authMiddleware } from './auth.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';

const router = express.Router();

router.use(authRateLimiter);

// User OTP login
router.post('/user/request-otp', requestUserOtpController);
router.post('/user/verify-otp', verifyUserOtpController);

// Restaurant OTP login
router.post('/restaurant/request-otp', requestRestaurantOtpController);
router.post('/restaurant/verify-otp', verifyRestaurantOtpController);

// Delivery partner OTP login
router.post('/delivery/request-otp', requestDeliveryOtpController);
router.post('/delivery/verify-otp', verifyDeliveryOtpController);

// Admin login
router.post('/admin/login', adminLoginController);

// Refresh token
router.post('/refresh-token', refreshTokenController);

// Logout (invalidates refresh token)
router.post('/logout', logoutController);

// Authenticated user profile (requires Bearer token)
router.get('/me', authMiddleware, getMeController);

export default router;

