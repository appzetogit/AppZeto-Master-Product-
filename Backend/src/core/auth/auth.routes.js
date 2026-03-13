import express from 'express';
import { requestUserOtpController, verifyUserOtpController, adminLoginController, refreshTokenController } from './auth.controller.js';

const router = express.Router();

// User OTP login
router.post('/user/request-otp', requestUserOtpController);
router.post('/user/verify-otp', verifyUserOtpController);

// Admin login
router.post('/admin/login', adminLoginController);

// Refresh token
router.post('/refresh-token', refreshTokenController);

export default router;

