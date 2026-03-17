import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import {
    listHeroBannersController,
    uploadHeroBannersController,
    deleteHeroBannerController,
    updateHeroBannerOrderController,
    toggleHeroBannerStatusController
} from '../controllers/heroBanner.controller.js';
import {
    listUnder250BannersController,
    uploadUnder250BannersController,
    deleteUnder250BannerController,
    updateUnder250BannerOrderController,
    toggleUnder250BannerStatusController
} from '../controllers/under250Banner.controller.js';
import {
    listDiningBannersController,
    uploadDiningBannersController,
    deleteDiningBannerController,
    updateDiningBannerOrderController,
    toggleDiningBannerStatusController
} from '../controllers/diningBanner.controller.js';
import {
    getAdminLandingSettingsController,
    updateAdminLandingSettingsController
} from '../controllers/landingSettings.controller.js';
import {
    listExploreMoreController,
    createExploreMoreController,
    updateExploreMoreController,
    deleteExploreMoreController,
    toggleExploreMoreStatusController,
    updateExploreMoreOrderController
} from '../controllers/exploreIcon.controller.js';
import {
    getPublicHeroBannersController,
    getPublicUnder250BannersController,
    getPublicDiningBannersController,
    getPublicExploreIconsController,
    getPublicTop10Controller,
    getPublicGourmetController,
    getPublicLandingSettingsController
} from '../controllers/publicLanding.controller.js';
import { detectZonePublicController } from '../controllers/zonePublic.controller.js';
import { getPublicEnvController } from '../controllers/publicEnv.controller.js';
import {
    listTop10Admin,
    createTop10Admin,
    deleteTop10Admin,
    updateTop10OrderAdmin,
    updateTop10RankAdmin,
    toggleTop10StatusAdmin,
    listGourmetAdmin,
    createGourmetAdmin,
    deleteGourmetAdmin,
    updateGourmetOrderAdmin,
    toggleGourmetStatusAdmin
} from '../controllers/top10GourmetAdmin.controller.js';

const router = express.Router();

// Admin hero banner management (DEV: auth temporarily disabled for faster integration)
router.get('/hero-banners', listHeroBannersController);
router.post(
    '/hero-banners/multiple',
    upload.array('files'),
    uploadHeroBannersController
);
router.delete('/hero-banners/:id', deleteHeroBannerController);
router.patch('/hero-banners/:id/order', updateHeroBannerOrderController);
router.patch('/hero-banners/:id/status', toggleHeroBannerStatusController);

// Admin under 250 banners
router.get('/hero-banners/under-250', listUnder250BannersController);
router.post(
    '/hero-banners/under-250/multiple',
    upload.array('files'),
    uploadUnder250BannersController
);
router.delete('/hero-banners/under-250/:id', deleteUnder250BannerController);
router.patch('/hero-banners/under-250/:id/order', updateUnder250BannerOrderController);
router.patch('/hero-banners/under-250/:id/status', toggleUnder250BannerStatusController);

// Admin dining banners
router.get('/hero-banners/dining', listDiningBannersController);
router.post(
    '/hero-banners/dining/multiple',
    upload.array('files'),
    uploadDiningBannersController
);
router.delete('/hero-banners/dining/:id', deleteDiningBannerController);
router.patch('/hero-banners/dining/:id/order', updateDiningBannerOrderController);
router.patch('/hero-banners/dining/:id/status', toggleDiningBannerStatusController);

// Admin Explore More (icons)
router.get('/hero-banners/landing/explore-more', listExploreMoreController);
router.post(
    '/hero-banners/landing/explore-more',
    upload.single('image'),
    createExploreMoreController
);
router.delete('/hero-banners/landing/explore-more/:id', deleteExploreMoreController);
router.patch('/hero-banners/landing/explore-more/:id/status', toggleExploreMoreStatusController);
router.patch('/hero-banners/landing/explore-more/:id/order', updateExploreMoreOrderController);
router.patch(
    '/hero-banners/landing/explore-more/:id',
    upload.single('image'),
    updateExploreMoreController
);

// Admin Top 10 (hero-banners)
router.get('/hero-banners/top-10', listTop10Admin);
router.post('/hero-banners/top-10', createTop10Admin);
router.delete('/hero-banners/top-10/:id', deleteTop10Admin);
router.patch('/hero-banners/top-10/:id/order', updateTop10OrderAdmin);
router.patch('/hero-banners/top-10/:id/rank', updateTop10RankAdmin);
router.patch('/hero-banners/top-10/:id/status', toggleTop10StatusAdmin);

// Admin Gourmet (hero-banners)
router.get('/hero-banners/gourmet', listGourmetAdmin);
router.post('/hero-banners/gourmet', createGourmetAdmin);
router.delete('/hero-banners/gourmet/:id', deleteGourmetAdmin);
router.patch('/hero-banners/gourmet/:id/order', updateGourmetOrderAdmin);
router.patch('/hero-banners/gourmet/:id/status', toggleGourmetStatusAdmin);

// Public landing endpoints (Food user app)
router.get('/hero-banners/public', getPublicHeroBannersController);
router.get('/hero-banners/under-250/public', getPublicUnder250BannersController);
router.get('/hero-banners/dining/public', getPublicDiningBannersController);
router.get('/explore-icons/public', getPublicExploreIconsController);
router.get('/hero-banners/top-10/public', getPublicTop10Controller);
router.get('/hero-banners/gourmet/public', getPublicGourmetController);
router.get('/landing/settings/public', getPublicLandingSettingsController);
router.get('/zones/detect', detectZonePublicController);
router.get('/public/env', getPublicEnvController);
// Admin landing settings (old paths used by admin UI)
router.get('/hero-banners/landing/settings', getAdminLandingSettingsController);
router.patch('/hero-banners/landing/settings', updateAdminLandingSettingsController);

export default router;

