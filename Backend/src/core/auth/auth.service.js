import ms from 'ms';
import { User } from '../users/user.model.js';
import { Admin } from '../admin/admin.model.js';
import { createOrUpdateOtp, verifyOtp } from '../otp/otp.service.js';
import { signAccessToken, signRefreshToken } from './token.util.js';
import { RefreshToken } from '../refreshTokens/refreshToken.model.js';
import { ValidationError, AuthError } from './errors.js';
import { config } from '../../config/env.js';

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

    let user = await User.findOne({ phone });
    if (!user) {
        user = await User.create({ phone });
    }

    const payload = { userId: user._id.toString(), role: user.role };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const ttlMs = ms(config.jwtRefreshExpiresIn || '7d');
    const expiresAt = new Date(Date.now() + ttlMs);

    await RefreshToken.create({
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

    const admin = await Admin.findOne({ email });
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

    await RefreshToken.create({
        userId: admin._id,
        token: refreshToken,
        expiresAt
    });

    return { accessToken, refreshToken, admin };
};

export const refreshAccessToken = async (token) => {
    if (!token) {
        throw new ValidationError('Refresh token is required');
    }

    const stored = await RefreshToken.findOne({ token });
    if (!stored) {
        throw new AuthError('Invalid refresh token');
    }

    try {
        const decoded = signRefreshToken ? null : null; // placeholder to keep linter happy
    } catch {
        // no-op
    }

    // We only trust stored token validity via TTL; simply decode again
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

