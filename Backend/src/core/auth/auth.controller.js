import {
    requestUserOtp,
    verifyUserOtpAndLogin,
    adminLogin,
    refreshAccessToken,
    requestRestaurantOtp,
    verifyRestaurantOtpAndLogin,
    requestDeliveryOtp,
    verifyDeliveryOtpAndLogin,
    logout,
    getProfile
} from './auth.service.js';
import { validateUserOtpRequestDto } from '../../dtos/auth/userOtpRequest.dto.js';
import { validateUserOtpVerifyDto } from '../../dtos/auth/userOtpVerify.dto.js';
import { validateAdminLoginDto } from '../../dtos/auth/adminLogin.dto.js';
import { validateRestaurantOtpRequestDto } from '../../dtos/auth/restaurantOtpRequest.dto.js';
import { validateRestaurantOtpVerifyDto } from '../../dtos/auth/restaurantOtpVerify.dto.js';
import { validateDeliveryOtpRequestDto } from '../../dtos/auth/deliveryOtpRequest.dto.js';
import { validateDeliveryOtpVerifyDto } from '../../dtos/auth/deliveryOtpVerify.dto.js';
import { validateLogoutDto } from '../../dtos/auth/logout.dto.js';
import { validateRefreshTokenDto } from '../../dtos/auth/refreshToken.dto.js';
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
        const { refreshToken } = validateRefreshTokenDto(req.body);
        const result = await refreshAccessToken(refreshToken);
        return sendResponse(res, 200, 'Access token refreshed', result);
    } catch (error) {
        next(error);
    }
};

export const requestRestaurantOtpController = async (req, res, next) => {
    try {
        const { phone } = validateRestaurantOtpRequestDto(req.body);
        const result = await requestRestaurantOtp(phone);
        return sendResponse(res, 200, 'OTP sent successfully', { phone, ...result });
    } catch (error) {
        next(error);
    }
};

export const verifyRestaurantOtpController = async (req, res, next) => {
    try {
        const { phone, otp } = validateRestaurantOtpVerifyDto(req.body);
        const result = await verifyRestaurantOtpAndLogin(phone, otp);
        return sendResponse(res, 200, 'Login successful', result);
    } catch (error) {
        next(error);
    }
};

export const requestDeliveryOtpController = async (req, res, next) => {
    try {
        const { phone } = validateDeliveryOtpRequestDto(req.body);
        const result = await requestDeliveryOtp(phone);
        return sendResponse(res, 200, 'OTP sent successfully', { phone, ...result });
    } catch (error) {
        next(error);
    }
};

export const verifyDeliveryOtpController = async (req, res, next) => {
    try {
        const { phone, otp } = validateDeliveryOtpVerifyDto(req.body);
        const result = await verifyDeliveryOtpAndLogin(phone, otp);
        return sendResponse(res, 200, 'Login successful', result);
    } catch (error) {
        next(error);
    }
};

export const logoutController = async (req, res, next) => {
    try {
        const { refreshToken } = validateLogoutDto(req.body);
        const result = await logout(refreshToken);
        return sendResponse(res, 200, result.invalidated ? 'Logged out successfully' : 'Token already invalid', result);
    } catch (error) {
        next(error);
    }
};

export const getMeController = async (req, res, next) => {
    try {
        const { userId, role } = req.user;
        const result = await getProfile(userId, role);
        return sendResponse(res, 200, 'Profile retrieved successfully', result);
    } catch (error) {
        next(error);
    }
};

