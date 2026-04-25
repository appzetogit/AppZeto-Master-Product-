import express from 'express';

import adminRoutes from '../admin/routes/adminRoutes.js';
import authRoutes from './authRoutes.js';
import availabilityRoutes from './availabilityRoutes.js';
import blogRoutes from './blogRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import contactRoutes from './contactRoutes.js';
import faqRoutes from './faqRoutes.js';
import hotelRoutes from './hotelRoutes.js';
import infoRoutes from './infoRoutes.js';
import offerRoutes from './offerRoutes.js';
import partnerRoutes from '../partner/routes/partnerRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import propertyRoutes from './propertyRoutes.js';
import referralRoutes from './referralRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import userRoutes from '../user/routes/userRoutes.js';
import walletRoutes from './walletRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/offers', offerRoutes);
router.use('/wallet', walletRoutes);
router.use('/info', infoRoutes);
router.use('/contact', contactRoutes);
router.use('/properties', propertyRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/payments', paymentRoutes);
router.use('/availability', availabilityRoutes);
router.use('/hotels', hotelRoutes);
router.use('/referrals', referralRoutes);
router.use('/faqs', faqRoutes);
router.use('/partners', partnerRoutes);
router.use('/blogs', blogRoutes);

export default router;
