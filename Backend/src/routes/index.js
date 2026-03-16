import express from 'express';
import authRoutes from '../core/auth/auth.routes.js';
import deliveryRoutes from '../modules/zomato/delivery/routes/delivery.routes.js';
import restaurantRoutes from '../modules/zomato/restaurant/routes/restaurant.routes.js';
import landingRoutes from '../modules/zomato/landing/routes/landing.routes.js';
import { authMiddleware } from '../core/auth/auth.middleware.js';
import { requireRoles } from '../core/roles/role.middleware.js';
import { getQueuesController } from '../controllers/admin.controller.js';

const router = express.Router();

router.get('/v1/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

router.use('/v1/auth', authRoutes);
router.use('/v1/zomato/delivery', deliveryRoutes);
router.use('/v1/zomato/restaurant', restaurantRoutes);
router.use('/v1/zomato/landing', landingRoutes);

router.get('/v1/admin/queues', authMiddleware, requireRoles('ADMIN'), getQueuesController);

export default router;
