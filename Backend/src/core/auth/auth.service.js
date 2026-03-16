import ms from 'ms';
import { ZomatoUser } from '../users/user.model.js';
import { ZomatoAdmin } from '../admin/admin.model.js';
import { ZomatoRestaurant } from '../../modules/zomato/restaurant/models/restaurant.model.js';
import { ZomatoDeliveryPartner } from '../../modules/zomato/delivery/models/deliveryPartner.model.js';
import { createOrUpdateOtp, verifyOtp } from '../otp/otp.service.js';
import { signAccessToken, signRefreshToken } from './token.util.js';
import { ZomatoRefreshToken } from '../refreshTokens/refreshToken.model.js';
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
    let userDoc = await ZomatoUser.findOne({ phone });
    if (!userDoc) {
        userDoc = await ZomatoUser.create({ phone, isVerified: true });
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

    await ZomatoRefreshToken.create({
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

    const admin = await ZomatoAdmin.findOne({ email });
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

    await ZomatoRefreshToken.create({
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

    const restaurant = await ZomatoRestaurant.findOne({ ownerPhone: phone }).lean();
    if (!restaurant) {
        throw new AuthError('No restaurant found with this phone. Please complete onboarding first.');
    }

    const payload = { userId: restaurant._id.toString(), role: ROLES.RESTAURANT };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const ttlMs = ms(config.jwtRefreshExpiresIn || '7d');
    const expiresAt = new Date(Date.now() + ttlMs);

    await ZomatoRefreshToken.create({
        userId: restaurant._id,
        token: refreshToken,
        expiresAt
    });

    return { accessToken, refreshToken, user: restaurant };
};

export const requestDeliveryOtp = async (phone) => {
    if (!phone) {
        throw new ValidationError('Phone is required');
    }
    const otp = await createOrUpdateOtp(phone);
    return { otp };
};

export const verifyDeliveryOtpAndLogin = async (phone, otp) => {
    const result = await verifyOtp(phone, otp);
    if (!result.valid) {
        throw new AuthError(result.reason || 'OTP verification failed');
    }

    let deliveryPartner = await ZomatoDeliveryPartner.findOne({ phone }).lean();
    let needsRegistration = false;

    if (!deliveryPartner) {
        const created = await ZomatoDeliveryPartner.create({
            phone,
            name: 'Pending',
            status: 'pending'
        });
        deliveryPartner = created.toObject();
        needsRegistration = true;
    }

    const payload = { userId: deliveryPartner._id.toString(), role: ROLES.DELIVERY_PARTNER };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const ttlMs = ms(config.jwtRefreshExpiresIn || '7d');
    const expiresAt = new Date(Date.now() + ttlMs);

    await ZomatoRefreshToken.create({
        userId: deliveryPartner._id,
        token: refreshToken,
        expiresAt
    });

    return { accessToken, refreshToken, user: deliveryPartner, needsRegistration };
};

export const logout = async (refreshToken) => {
    if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
    }
    const deleted = await ZomatoRefreshToken.deleteOne({ token: refreshToken });
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
            profile = await ZomatoUser.findById(id).lean();
            break;
        case ROLES.ADMIN:
            profile = await ZomatoAdmin.findById(id).select('-password').lean();
            break;
        case ROLES.RESTAURANT:
            profile = await ZomatoRestaurant.findById(id).lean();
            break;
        case ROLES.DELIVERY_PARTNER:
            profile = await ZomatoDeliveryPartner.findById(id).lean();
            break;
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

    const stored = await ZomatoRefreshToken.findOne({ token }).lean();
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

