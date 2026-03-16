import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../../core/roles/role.middleware.js';
import {
    listHeroBannersController,
    uploadHeroBannersController,
    deleteHeroBannerController,
    updateHeroBannerOrderController,
    toggleHeroBannerStatusController
} from '../controllers/heroBanner.controller.js';
import {
    getPublicHeroBannersController,
    getPublicUnder250BannersController,
    getPublicDiningBannersController,
    getPublicExploreIconsController,
    getPublicTop10Controller,
    getPublicGourmetController,
    getPublicLandingSettingsController
} from '../controllers/publicLanding.controller.js';

const router = express.Router();

// Admin hero banner management
router.get('/hero-banners', authMiddleware, requireRoles('ADMIN'), listHeroBannersController);
router.post(
    '/hero-banners/multiple',
    authMiddleware,
    requireRoles('ADMIN'),
    upload.array('files'),
    uploadHeroBannersController
);
router.delete('/hero-banners/:id', authMiddleware, requireRoles('ADMIN'), deleteHeroBannerController);
router.patch('/hero-banners/:id/order', authMiddleware, requireRoles('ADMIN'), updateHeroBannerOrderController);
router.patch('/hero-banners/:id/status', authMiddleware, requireRoles('ADMIN'), toggleHeroBannerStatusController);

// Public landing endpoints (Zomato user app)
router.get('/hero-banners/public', getPublicHeroBannersController);
router.get('/under-250-banners/public', getPublicUnder250BannersController);
router.get('/dining-banners/public', getPublicDiningBannersController);
router.get('/explore-icons/public', getPublicExploreIconsController);
router.get('/hero-banners/top-10/public', getPublicTop10Controller);
router.get('/hero-banners/gourmet/public', getPublicGourmetController);
router.get('/landing/settings/public', getPublicLandingSettingsController);

export default router;
