import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
    getMyReferral,
    createReferralProgram,
    getActiveProgram,
    generateCustomCode
} from '../controllers/referralController.js';

const router = express.Router();

// Public / User Routes
router.get('/my-stats', protect, getMyReferral);
router.get('/program/active', getActiveProgram);

// Admin Routes
router.post('/program', protect, authorizedRoles('admin', 'superadmin'), createReferralProgram);
router.post('/code/generate', protect, authorizedRoles('admin', 'superadmin'), generateCustomCode);

export default router;
