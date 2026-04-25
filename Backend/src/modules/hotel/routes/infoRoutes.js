import express from 'express';
import { getPublicPage, getPublicPlatformStatus, getFinancialSettings } from '../controllers/infoController.js';

const router = express.Router();

router.get('/platform/status', getPublicPlatformStatus);
router.get('/platform/financials', getFinancialSettings);
router.get('/:audience/:slug', getPublicPage);

export default router;
