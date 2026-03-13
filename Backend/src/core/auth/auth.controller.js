import { requestUserOtp, verifyUserOtpAndLogin, adminLogin, refreshAccessToken } from './auth.service.js';
import { validateUserOtpRequestDto } from '../../dtos/auth/userOtpRequest.dto.js';
import { validateUserOtpVerifyDto } from '../../dtos/auth/userOtpVerify.dto.js';
import { validateAdminLoginDto } from '../../dtos/auth/adminLogin.dto.js';
import { sendResponse } from '../../utils/response.js';

export const requestUserOtpController = async (req, res, next) => {
    try {
        const { phone } = validateUserOtpRequestDto(req.body);
        const result = await requestUserOtp(phone);
        return sendResponse(res, 200, 'OTP sent successfully', { phone, ...result });
    } catch (error) {
        next(error);
    }
};

export const verifyUserOtpController = async (req, res, next) => {
    try {
        const { phone, otp } = validateUserOtpVerifyDto(req.body);
        const result = await verifyUserOtpAndLogin(phone, otp);
        return sendResponse(res, 200, 'Login successful', result);
    } catch (error) {
        next(error);
    }
};

export const adminLoginController = async (req, res, next) => {
    try {
        const { email, password } = validateAdminLoginDto(req.body);
        const result = await adminLogin(email, password);
        return sendResponse(res, 200, 'Admin login successful', result);
    } catch (error) {
        next(error);
    }
};

export const refreshTokenController = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const result = await refreshAccessToken(refreshToken);
        return sendResponse(res, 200, 'Access token refreshed', result);
    } catch (error) {
        next(error);
    }
};

