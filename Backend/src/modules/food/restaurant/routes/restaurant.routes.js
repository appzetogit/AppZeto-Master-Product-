import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import {
    registerRestaurantController,
    listApprovedRestaurantsController,
    getApprovedRestaurantController,
    listPublicOffersController,
    getCurrentRestaurantController,
    updateRestaurantProfileController,
    updateRestaurantAcceptingOrdersController,
    uploadRestaurantProfileImageController,
    uploadRestaurantMenuImageController
} from '../controllers/restaurant.controller.js';
import {
    listCategoriesController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController
} from '../controllers/restaurantCategory.controller.js';
import { getMenuController, updateMenuController, getPublicRestaurantMenuController } from '../controllers/restaurantMenu.controller.js';
import { getPublicRestaurantAddonsController } from '../controllers/publicAddons.controller.js';
import {
    getOutletTimingsByRestaurantIdController,
    getCurrentRestaurantOutletTimingsController,
    upsertCurrentRestaurantOutletTimingsController
} from '../controllers/outletTimings.controller.js';
import {
    createRestaurantFoodController,
    updateRestaurantFoodController
} from '../controllers/restaurantFood.controller.js';
import {
    listAddonsController,
    createAddonController,
    updateAddonController,
    deleteAddonController
} from '../controllers/restaurantAddon.controller.js';
import * as orderController from '../../orders/order.controller.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { sendError } from '../../../../utils/response.js';

const router = express.Router();

const requireRestaurant = (req, res, next) => {
    if (req.user?.role !== 'RESTAURANT') {
        return sendError(res, 403, 'Restaurant access required');
    }
    next();
};

const uploadFields = upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'panImage', maxCount: 1 },
    { name: 'gstImage', maxCount: 1 },
    { name: 'fssaiImage', maxCount: 1 },
    { name: 'menuImages', maxCount: 10 }
]);

router.post('/register', uploadFields, registerRestaurantController);

// Public: approved restaurants list (for user app)
router.get('/restaurants', listApprovedRestaurantsController);
router.get('/restaurants/:id', getApprovedRestaurantController);
router.get('/restaurants/:id/menu', getPublicRestaurantMenuController);
router.get('/restaurants/:id/outlet-timings', getOutletTimingsByRestaurantIdController);
router.get('/offers', listPublicOffersController);
// Public: categories list (zone-aware; returns zone categories + global)
router.get('/categories/public', listCategoriesController);

// Restaurant dashboard/profile (Bearer token + RESTAURANT role)
router.get('/current', authMiddleware, requireRestaurant, getCurrentRestaurantController);
router.patch('/profile', authMiddleware, requireRestaurant, updateRestaurantProfileController);
router.patch('/availability', authMiddleware, requireRestaurant, updateRestaurantAcceptingOrdersController);
router.get('/outlet-timings', authMiddleware, requireRestaurant, getCurrentRestaurantOutletTimingsController);
router.put('/outlet-timings', authMiddleware, requireRestaurant, upsertCurrentRestaurantOutletTimingsController);
router.post(
    '/profile/profile-image',
    authMiddleware,
    requireRestaurant,
    upload.single('file'),
    uploadRestaurantProfileImageController
);
router.post(
    '/profile/menu-image',
    authMiddleware,
    requireRestaurant,
    upload.single('file'),
    uploadRestaurantMenuImageController
);

// Categories (restaurant dashboard). Read-only for item creation, CRUD for Menu Categories page.
router.get('/categories', authMiddleware, requireRestaurant, listCategoriesController);
router.post('/categories', authMiddleware, requireRestaurant, createCategoryController);
router.patch('/categories/:id', authMiddleware, requireRestaurant, updateCategoryController);
router.delete('/categories/:id', authMiddleware, requireRestaurant, deleteCategoryController);

// Menu (restaurant dashboard) - only fields needed by UI
router.get('/menu', authMiddleware, requireRestaurant, getMenuController);
router.patch('/menu', authMiddleware, requireRestaurant, updateMenuController);

// Public: restaurant add-ons (user app)
router.get('/restaurants/:id/addons', getPublicRestaurantAddonsController);

// Foods (restaurant creates/updates items -> stored in food_items collection)
router.post('/foods', authMiddleware, requireRestaurant, createRestaurantFoodController);
router.patch('/foods/:id', authMiddleware, requireRestaurant, updateRestaurantFoodController);

// Add-ons (restaurant dashboard) - approval handled by admin
router.get('/addons', authMiddleware, requireRestaurant, listAddonsController);
router.post('/addons', authMiddleware, requireRestaurant, createAddonController);
router.patch('/addons/:id', authMiddleware, requireRestaurant, updateAddonController);
router.delete('/addons/:id', authMiddleware, requireRestaurant, deleteAddonController);

// Orders (restaurant dashboard)
router.get('/orders', authMiddleware, requireRestaurant, orderController.listOrdersRestaurantController);
router.patch('/orders/:orderId/status', authMiddleware, requireRestaurant, orderController.updateOrderStatusRestaurantController);

export default router;

