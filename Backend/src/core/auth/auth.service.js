import ms from 'ms';
import { FoodUser } from '../users/user.model.js';
import { FoodAdmin } from '../admin/admin.model.js';
import { FoodRestaurant } from '../../modules/food/restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../modules/food/delivery/models/deliveryPartner.model.js';
import { createOrUpdateOtp, verifyOtp } from '../otp/otp.service.js';
import { signAccessToken, signRefreshToken } from './token.util.js';
import { FoodRefreshToken } from '../refreshTokens/refreshToken.model.js';
import { ValidationError, AuthError } from './errors.js';
import { config } from '../../config/env.js';

const ROLES = { USER: 'USER', RESTAURANT: 'RESTAURANT', DELIVERY_PARTNER: 'DELIVERY_PARTNER', ADMIN: 'ADMIN' };

export const requestUserOtp = async (phone) => {
    if (!phone) {
        throw new ValidationError('Phone is required');
    }

    const otp = await createOrUpdateOtp(phone);
    // TODO: integrate SMS provider here
    return { otp }; // for now return OTP (for dev/testing)
};

export const verifyUserOtpAndLogin = async (phone, otp) => {
    const result = await verifyOtp(phone, otp);

    if (!result.valid) {
        throw new AuthError(result.reason || 'OTP verification failed');
    }

    // Ensure user exists and mark as verified on successful OTP.
    let userDoc = await FoodUser.findOne({ phone });
    if (!userDoc) {
        userDoc = await FoodUser.create({ phone, isVerified: true });
    } else if (!userDoc.isVerified) {
        userDoc.isVerified = true;
        await userDoc.save();
    }

    const user = userDoc.toObject();
    const payload = { userId: user._id.toString(), role: user.role || 'USER' };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const ttlMs = ms(config.jwtRefreshExpiresIn || '7d');
    const expiresAt = new Date(Date.now() + ttlMs);

    await FoodRefreshToken.create({
        userId: user._id,
        token: refreshToken,
        expiresAt
    });

    return { accessToken, refreshToken, user };
};

export const adminLogin = async (email, password) => {
    if (!email || !password) {
        throw new ValidationError('Email and password are required');
    }

    const admin = await FoodAdmin.findOne({ email });
    if (!admin) {
        throw new AuthError('Invalid credentials');
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
        throw new AuthError('Invalid credentials');
    }

    const payload = { userId: admin._id.toString(), role: admin.role };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const ttlMs = ms(config.jwtRefreshExpiresIn || '7d');
    const expiresAt = new Date(Date.now() + ttlMs);

    await FoodRefreshToken.create({
        userId: admin._id,
        token: refreshToken,
        expiresAt
    });

    const userObj = admin.toObject();
    delete userObj.password;
    return { accessToken, refreshToken, user: userObj };
};

export const requestRestaurantOtp = async (phone) => {
    if (!phone) {
        throw new ValidationError('Phone is required');
    }
    const otp = await createOrUpdateOtp(phone);
    return { otp };
};

export const verifyRestaurantOtpAndLogin = async (phone, otp) => {
    const result = await verifyOtp(phone, otp);
    if (!result.valid) {
        throw new AuthError(result.reason || 'OTP verification failed');
    }

    const restaurant = await FoodRestaurant.findOne({ ownerPhone: phone }).lean();
    if (!restaurant) {
        // Phone has been successfully verified, but no restaurant exists yet.
        // Frontend will use this to redirect into registration/onboarding.
        return {
            needsRegistration: true,
            phone
        };
    }

    // If restaurant approval status is used, only allow login for approved restaurants.
    if (restaurant.status && restaurant.status !== 'approved') {
        throw new AuthError(
            restaurant.status === 'pending'
                ? 'Your restaurant registration is pending approval.'
                : 'Your restaurant registration has been rejected. Please contact support.'
        );
    }

    const payload = { userId: restaurant._id.toString(), role: ROLES.RESTAURANT };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const ttlMs = ms(config.jwtRefreshExpiresIn || '7d');
    const expiresAt = new Date(Date.now() + ttlMs);

    await FoodRefreshToken.create({
        userId: restaurant._id,
        token: refreshToken,
        expiresAt
    });

    return { accessToken, refreshToken, user: restaurant, needsRegistration: false };
};

export const requestDeliveryOtp = async (phone) => {
    if (!phone) {
        throw new ValidationError('Phone is required');
    }
    const otp = await createOrUpdateOtp(phone);
    return { otp };
};

const normalizePhoneForDelivery = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.slice(-10) || null;
};

export const verifyDeliveryOtpAndLogin = async (phone, otp) => {
    const result = await verifyOtp(phone, otp);
    if (!result.valid) {
        throw new AuthError(result.reason || 'OTP verification failed');
    }

    const normalized = normalizePhoneForDelivery(phone);
    if (!normalized) {
        return { needsRegistration: true, phone };
    }

    const deliveryPartner = await FoodDeliveryPartner.findOne({
        $or: [
            { phone: normalized },
            { phone: { $regex: new RegExp(normalized + '$') } }
        ]
    }).lean();

    if (!deliveryPartner) {
        return { needsRegistration: true, phone };
    }

    if (deliveryPartner.status && deliveryPartner.status !== 'approved') {
        return {
            pendingApproval: true,
            message: deliveryPartner.status === 'rejected'
                ? 'Your delivery account was not approved. Please contact support.'
                : 'Your account is pending admin verification. You will be notified once approved.'
        };
    }

    const payload = { userId: deliveryPartner._id.toString(), role: ROLES.DELIVERY_PARTNER };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const ttlMs = ms(config.jwtRefreshExpiresIn || '7d');
    const expiresAt = new Date(Date.now() + ttlMs);

    await FoodRefreshToken.create({
        userId: deliveryPartner._id,
        token: refreshToken,
        expiresAt
    });

    return { accessToken, refreshToken, user: deliveryPartner, needsRegistration: false };
};

export const logout = async (refreshToken) => {
    if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
    }
    const deleted = await FoodRefreshToken.deleteOne({ token: refreshToken });
    return { invalidated: deleted.deletedCount > 0 };
};

export const getProfile = async (userId, role) => {
    if (!userId || !role) {
        throw new AuthError('Invalid token payload');
    }
    let profile = null;
    const id = userId;

    switch (role) {
        case ROLES.USER:
            profile = await FoodUser.findById(id).lean();
            break;
        case ROLES.ADMIN:
            profile = await FoodAdmin.findById(id).select('-password').lean();
            break;
        case ROLES.RESTAURANT:
            profile = await FoodRestaurant.findById(id).lean();
            break;
        case ROLES.DELIVERY_PARTNER: {
            const partner = await FoodDeliveryPartner.findById(id).lean();
            if (!partner) break;
            const deliveryId = partner._id
                ? `DP-${partner._id.toString().slice(-8).toUpperCase()}`
                : null;
            profile = {
                ...partner,
                email: partner.email || null,
                deliveryId,
                status: partner.status === 'rejected' ? 'blocked' : partner.status,
                profileImage: partner.profilePhoto ? { url: partner.profilePhoto } : null,
                documents: {
                    aadhar: (partner.aadharPhoto || partner.aadharNumber) ? {
                        number: partner.aadharNumber || null,
                        document: partner.aadharPhoto || null
                    } : null,
                    pan: (partner.panPhoto || partner.panNumber) ? {
                        number: partner.panNumber || null,
                        document: partner.panPhoto || null
                    } : null,
                    drivingLicense: partner.drivingLicensePhoto ? { document: partner.drivingLicensePhoto } : null,
                    bankDetails: (partner.bankAccountHolderName || partner.bankAccountNumber || partner.bankIfscCode || partner.bankName) ? {
                        accountHolderName: partner.bankAccountHolderName || null,
                        accountNumber: partner.bankAccountNumber || null,
                        ifscCode: partner.bankIfscCode || null,
                        bankName: partner.bankName || null
                    } : null
                },
                location: (partner.address || partner.city || partner.state) ? {
                    addressLine1: partner.address,
                    city: partner.city,
                    state: partner.state
                } : null,
                vehicle: (partner.vehicleType || partner.vehicleName || partner.vehicleNumber) ? {
                    type: partner.vehicleType,
                    brand: partner.vehicleName,
                    model: partner.vehicleName,
                    number: partner.vehicleNumber
                } : null
            };
            break;
        }
        default:
            throw new AuthError('Unknown role');
    }

    if (!profile) {
        throw new AuthError('Profile not found');
    }
    return { user: profile };
};

export const refreshAccessToken = async (token) => {
    if (!token) {
        throw new ValidationError('Refresh token is required');
    }

    const stored = await FoodRefreshToken.findOne({ token }).lean();
    if (!stored) {
        throw new AuthError('Invalid refresh token');
    }

    const jwt = await import('jsonwebtoken');
    let payload;
    try {
        payload = jwt.default.verify(token, config.jwtRefreshSecret);
    } catch {
        throw new AuthError('Invalid refresh token');
    }

    const newAccessToken = signAccessToken({
        userId: payload.userId,
        role: payload.role
    });

    return { accessToken: newAccessToken };
};

