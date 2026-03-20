import express from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { sendError } from '../../utils/response.js';
import {
    removeFirebaseDeviceToken,
    sendTestNotification,
    upsertFirebaseDeviceToken
} from './firebase.service.js';

const router = express.Router();

const getOwnerContext = (req) => ({
    ownerType: req.user?.role,
    ownerId: req.user?.userId
});

router.post('/save', authMiddleware, async (req, res, next) => {
    try {
        const { ownerType, ownerId } = getOwnerContext(req);
        const token = String(req.body?.token || '').trim();
        const platform = req.body?.platform === 'mobile' ? 'mobile' : 'web';

        if (!ownerType || !ownerId) {
            return sendError(res, 401, 'Authentication required');
        }

        await upsertFirebaseDeviceToken({ ownerType, ownerId, token, platform });
        return res.status(200).json({
            success: true,
            message: 'FCM token saved',
            data: { ownerType, ownerId, platform }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/mobile/save', authMiddleware, async (req, res, next) => {
    try {
        const { ownerType, ownerId } = getOwnerContext(req);
        const token = String(req.body?.token || '').trim();

        if (!ownerType || !ownerId) {
            return sendError(res, 401, 'Authentication required');
        }

        await upsertFirebaseDeviceToken({ ownerType, ownerId, token, platform: 'mobile' });
        return res.status(200).json({
            success: true,
            message: 'Mobile FCM token saved',
            data: { ownerType, ownerId, platform: 'mobile' }
        });
    } catch (error) {
        next(error);
    }
});

const handleRemoveToken = async (req, res, next) => {
    try {
        const { ownerType, ownerId } = getOwnerContext(req);
        const token = String(req.params?.token || req.body?.token || '').trim();
        const platform = req.body?.platform === 'mobile' ? 'mobile' : req.body?.platform === 'web' ? 'web' : undefined;

        if (!ownerType || !ownerId) {
            return sendError(res, 401, 'Authentication required');
        }

        await removeFirebaseDeviceToken({ ownerType, ownerId, token, platform });
        return res.status(200).json({
            success: true,
            message: 'FCM token removed'
        });
    } catch (error) {
        next(error);
    }
};

router.delete('/remove', authMiddleware, handleRemoveToken);
router.delete('/remove/:token', authMiddleware, handleRemoveToken);

router.post('/test', authMiddleware, async (req, res, next) => {
    try {
        const { ownerType, ownerId } = getOwnerContext(req);
        const platform = req.body?.platform === 'mobile' ? 'mobile' : req.body?.platform === 'web' ? 'web' : undefined;

        if (!ownerType || !ownerId) {
            return sendError(res, 401, 'Authentication required');
        }

        const result = await sendTestNotification({ ownerType, ownerId, platform });
        return res.status(200).json({
            success: true,
            message: 'Test notification sent',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

export default router;
