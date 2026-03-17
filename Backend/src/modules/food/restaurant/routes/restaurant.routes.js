import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import {
    registerRestaurantController,
    listApprovedRestaurantsController,
    getApprovedRestaurantController,
    listPublicOffersController,
    getCurrentRestaurantController,
    updateRestaurantProfileController,
    uploadRestaurantProfileImageController,
    uploadRestaurantMenuImageController
} from '../controllers/restaurant.controller.js';
import {
    addRestaurantStaffController,
    listRestaurantStaffController,
    deleteRestaurantStaffController
} from '../controllers/restaurantStaff.controller.js';
import {
    listCategoriesController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController
} from '../controllers/restaurantCategory.controller.js';
import { getMenuController, updateMenuController } from '../controllers/restaurantMenu.controller.js';
import {
    createRestaurantFoodController,
    updateRestaurantFoodController
} from '../controllers/restaurantFood.controller.js';
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
router.get('/offers', listPublicOffersController);

// Restaurant dashboard/profile (Bearer token + RESTAURANT role)
router.get('/current', authMiddleware, requireRestaurant, getCurrentRestaurantController);
router.patch('/profile', authMiddleware, requireRestaurant, updateRestaurantProfileController);
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

// Staff/manager invites (restaurant dashboard)
router.post('/staff', authMiddleware, requireRestaurant, upload.single('photo'), addRestaurantStaffController);
router.get('/staff', authMiddleware, requireRestaurant, listRestaurantStaffController);
router.delete('/staff/:id', authMiddleware, requireRestaurant, deleteRestaurantStaffController);

// Categories (restaurant dashboard). Read-only for item creation, CRUD for Menu Categories page.
router.get('/categories', authMiddleware, requireRestaurant, listCategoriesController);
router.post('/categories', authMiddleware, requireRestaurant, createCategoryController);
router.patch('/categories/:id', authMiddleware, requireRestaurant, updateCategoryController);
router.delete('/categories/:id', authMiddleware, requireRestaurant, deleteCategoryController);

// Menu (restaurant dashboard) - only fields needed by UI
router.get('/menu', authMiddleware, requireRestaurant, getMenuController);
router.patch('/menu', authMiddleware, requireRestaurant, updateMenuController);

// Foods (restaurant creates/updates items -> stored in food_items collection)
router.post('/foods', authMiddleware, requireRestaurant, createRestaurantFoodController);
router.patch('/foods/:id', authMiddleware, requireRestaurant, updateRestaurantFoodController);

export default router;

