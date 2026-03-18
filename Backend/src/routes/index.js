import express from 'express';
import authRoutes from '../core/auth/auth.routes.js';
import deliveryRoutes from '../modules/food/delivery/routes/delivery.routes.js';
import restaurantRoutes from '../modules/food/restaurant/routes/restaurant.routes.js';
import landingRoutes from '../modules/food/landing/routes/landing.routes.js';
import { getPublicDiningCategories, getPublicDiningRestaurants } from '../modules/food/dining/controllers/diningPublic.controller.js';
import uploadRoutes from '../modules/uploads/routes/upload.routes.js';
import restaurantAdminRoutes from '../modules/food/admin/routes/admin.routes.js';
import userRoutes from '../modules/food/user/routes/user.routes.js';
import orderUserRoutes from '../modules/food/orders/order.routes.user.js';
import { authMiddleware } from '../core/auth/auth.middleware.js';
import { requireRoles } from '../core/roles/role.middleware.js';
import { getQueuesController } from '../controllers/admin.controller.js';

const router = express.Router();

router.get('/v1/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

// Food-prefixed auth routes (preferred)
router.use('/v1/food/auth', authRoutes);

// Backward-compatible auth routes (legacy)
router.use('/v1/auth', authRoutes);
router.use('/v1/food/delivery', deliveryRoutes);
router.use('/v1/food/restaurant', restaurantRoutes);
// Landing & hero-banners for Food user app (paths start with /food/hero-banners/...)
router.use('/v1/food', landingRoutes);
router.get('/v1/food/dining/categories/public', getPublicDiningCategories);
router.get('/v1/food/dining/restaurants/public', getPublicDiningRestaurants);
router.use('/v1/uploads', uploadRoutes);
router.use('/v1/food/admin', authMiddleware, requireRoles('ADMIN'), restaurantAdminRoutes);
router.use('/v1/food/user', authMiddleware, requireRoles('USER'), userRoutes);
router.use('/v1/food/orders', authMiddleware, requireRoles('USER'), orderUserRoutes);

router.get('/v1/admin/queues', authMiddleware, requireRoles('ADMIN'), getQueuesController);

export default router;
