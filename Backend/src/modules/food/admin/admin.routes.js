import express from 'express';
import { FoodRestaurant } from '../restaurant/models/restaurant.model.js';
import { AuthError } from '../../../core/auth/errors.js';

const router = express.Router();

// Middleware to ensure the requester is an authenticated admin
const requireAdmin = (req, _res, next) => {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
        return next(new AuthError('Admin access required'));
    }
    return next();
};

router.use(requireAdmin);

/** List restaurants for admin (dropdowns, reports, etc.). Query: limit, page, status */
router.get('/restaurants', async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 1000);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const skip = (page - 1) * limit;
        const status = req.query.status; // optional: pending, approved, rejected

        const filter = {};
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }

        const [restaurants, total] = await Promise.all([
            FoodRestaurant.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('restaurantName area city profileImage status ownerName ownerPhone')
                .lean(),
            FoodRestaurant.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            message: 'Restaurants fetched successfully',
            data: {
                restaurants,
                total,
                page,
                limit
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/restaurants/pending', async (_req, res, next) => {
    try {
        const pending = await FoodRestaurant.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({
            success: true,
            message: 'Pending restaurants fetched successfully',
            data: pending
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/restaurants/:id/approve', async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurant = await FoodRestaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        restaurant.status = 'approved';
        restaurant.approvedAt = new Date();
        restaurant.rejectedAt = undefined;
        restaurant.rejectionReason = undefined;
        await restaurant.save();

        res.status(200).json({
            success: true,
            message: 'Restaurant approved successfully',
            data: restaurant.toObject()
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/restaurants/:id/reject', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};

        const restaurant = await FoodRestaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        restaurant.status = 'rejected';
        restaurant.rejectedAt = new Date();
        restaurant.rejectionReason = typeof reason === 'string' ? reason.trim() : undefined;
        await restaurant.save();

        res.status(200).json({
            success: true,
            message: 'Restaurant rejected successfully',
            data: restaurant.toObject()
        });
    } catch (error) {
        next(error);
    }
});

export default router;

